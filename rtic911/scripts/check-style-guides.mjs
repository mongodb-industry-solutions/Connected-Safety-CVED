#!/usr/bin/env node
// Guide checker for the Via docs rewrite.
//
// Usage:
//   node scripts/check-style-guides.mjs [--no-render] [--only "<heading>"]... [file ...]
//
// Default files: utils/style/VIA-UI-GUIDE.md utils/style/PALETTE-GUIDE.md
// A missing default file is skipped with a warning; a missing explicit file is
// an error. `--only` (repeatable) restricts every check to sections whose
// heading text matches exactly (case-insensitive, trimmed).

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

// ---------------------------------------------------------------------------
// Paths and constants
// ---------------------------------------------------------------------------

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");
const requireFromRepo = createRequire(path.join(REPO_ROOT, "__guide_check__.js"));

const COMPONENTS_CSS = path.join(
  REPO_ROOT,
  "node_modules/@via-ds/components/dist/index.css",
);
const TYPESCRIPT_DIR = path.join(REPO_ROOT, "node_modules/typescript");
const TSC_BIN = path.join(TYPESCRIPT_DIR, "bin/tsc");
const GUIDE_CHECK_PREFIX = path.join(REPO_ROOT, "src/app/guide-check-");

const DEFAULT_FILES = [
  "utils/style/VIA-UI-GUIDE.md",
  "utils/style/PALETTE-GUIDE.md",
];

const PREAMBLE = "(preamble)";

const LEAFYGREEN_RE =
  /leafy ?green|@leafygreen-ui|@lg-|\bpalette\.(green|gray|grey|blue|yellow|red|purple|black|white)\b|\bspacing\[\d+\]/i;
const HEX_COLOR_RE = /#[0-9a-fA-F]{3,8}\b/g;
const FUNC_COLOR_RE = /\b(rgba?|hsla?)\(\s*\d/;
const TOKEN_NAME_RE = /--via-[a-z0-9-]+/g;
const TOKEN_DEFINITION_RE = /--via-[a-z0-9-]+(?=\s*:)/g;
const IMPORT_FROM_RE = /^\s*import\b.*\bfrom\s*['"]([^'"]+)['"]/;
const IMPORT_ANY_RE = /^\s*import\b[^'"]*['"]([^'"]+)['"]/;
const EXPORT_DEFAULT_RE = /\bexport\s+default\s+function\b/;
const DISALLOWED_IMPORT_RE = /^\s*import\b.*\bfrom\s*['"](?:@\/|next\/)/;

// ---------------------------------------------------------------------------
// CLI parsing
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const options = { noRender: false, only: [], files: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--no-render") {
      options.noRender = true;
    } else if (arg === "--only") {
      const value = argv[i + 1];
      if (value === undefined) fail("--only requires a heading value");
      options.only.push(value);
      i += 1;
    } else if (arg.startsWith("--")) {
      fail(`unknown option: ${arg}`);
    } else {
      options.files.push(arg);
    }
  }
  return options;
}

function fail(message) {
  process.stderr.write(`ERROR: ${message}\n`);
  process.exit(2);
}

// ---------------------------------------------------------------------------
// Cleanup registry (temp dirs, throwaway route)
// ---------------------------------------------------------------------------

const cleanups = new Set();

function registerCleanup(dir) {
  cleanups.add(dir);
}

function runCleanups() {
  for (const dir of cleanups) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      // best effort
    }
  }
  cleanups.clear();
}

process.on("SIGINT", () => {
  runCleanups();
  process.exit(130);
});
process.on("SIGTERM", () => {
  runCleanups();
  process.exit(143);
});
process.on("exit", runCleanups);

// ---------------------------------------------------------------------------
// Markdown parsing
// ---------------------------------------------------------------------------

function headingText(raw) {
  return raw.replace(/\s+#+\s*$/, "").trim();
}

function parseSections(text) {
  const lines = text.split("\n");
  const sections = [];
  const blocks = [];
  let current = { heading: PREAMBLE, lines: [] };
  sections.push(current);
  let inFence = false;
  let fenceLang = "";
  let fenceStart = 0;
  let fenceLines = [];

  lines.forEach((line, idx) => {
    const lineNo = idx + 1;
    if (!inFence) {
      const fence = line.match(/^```(\w*)/);
      if (fence) {
        inFence = true;
        fenceLang = fence[1];
        fenceStart = lineNo;
        fenceLines = [];
        current.lines.push({ line, lineNo });
        return;
      }
      const heading = line.match(/^(#{2,3})\s+(.*)$/);
      if (heading) {
        current = { heading: headingText(heading[2]), lines: [] };
        sections.push(current);
        current.lines.push({ line, lineNo });
        return;
      }
    } else if (/^```/.test(line)) {
      inFence = false;
      current.lines.push({ line, lineNo });
      blocks.push({
        section: current,
        lang: fenceLang,
        startLine: fenceStart + 1,
        code: fenceLines.join("\n"),
      });
      return;
    }
    if (inFence) fenceLines.push(line);
    current.lines.push({ line, lineNo });
  });

  return { sections, blocks };
}

// ---------------------------------------------------------------------------
// Token definitions
// ---------------------------------------------------------------------------

function loadDefinedTokens() {
  if (!fs.existsSync(COMPONENTS_CSS)) {
    fail(`token definitions not found: ${COMPONENTS_CSS}`);
  }
  const css = fs.readFileSync(COMPONENTS_CSS, "utf8");
  const defined = new Set();
  for (const match of css.matchAll(TOKEN_DEFINITION_RE)) defined.add(match[0]);
  return defined;
}

// ---------------------------------------------------------------------------
// Resolution helpers
// ---------------------------------------------------------------------------

function resolveSpecifier(specifier) {
  try {
    requireFromRepo.resolve(specifier);
    return true;
  } catch {
    return false;
  }
}

function importSpecifiers(code) {
  const specs = [];
  for (const line of code.split("\n")) {
    const match = line.match(IMPORT_ANY_RE);
    if (match) specs.push(match[1]);
  }
  return specs;
}

function isRelative(specifier) {
  return specifier.startsWith(".") || specifier.startsWith("/");
}

// ---------------------------------------------------------------------------
// Per-section line checks
// ---------------------------------------------------------------------------

function checkNoLeafygreen(section, file) {
  const hits = [];
  for (const { line, lineNo } of section.lines) {
    if (LEAFYGREEN_RE.test(line)) hits.push(`${file}:${lineNo}`);
  }
  return hits.length
    ? { status: "FAIL", details: hits.join(", ") }
    : { status: "PASS", details: "no matches" };
}

function checkTokensExist(section, file, defined) {
  const unknown = [];
  for (const { line, lineNo } of section.lines) {
    for (const match of line.matchAll(TOKEN_NAME_RE)) {
      if (!defined.has(match[0])) unknown.push(`${match[0]} (${file}:${lineNo})`);
    }
  }
  return unknown.length
    ? { status: "FAIL", details: unknown.join(", ") }
    : { status: "PASS", details: "all tokens defined" };
}

function checkNoLiteralColors(section, file) {
  const hits = [];
  for (const { line, lineNo } of section.lines) {
    if (/^\s*#{1,6}\s/.test(line)) continue; // headings are exempt
    for (const match of line.matchAll(HEX_COLOR_RE)) {
      if (match.index !== 0) hits.push(`${file}:${lineNo}`);
    }
    if (FUNC_COLOR_RE.test(line)) hits.push(`${file}:${lineNo}`);
  }
  return hits.length
    ? { status: "FAIL", details: [...new Set(hits)].join(", ") }
    : { status: "PASS", details: "no literal colors" };
}

function checkImportsResolve(section, file, blocks) {
  const unresolved = [];
  for (const block of blocks) {
    const lines = block.code.split("\n");
    lines.forEach((line, idx) => {
      const match = line.match(IMPORT_FROM_RE);
      if (!match || !match[1].startsWith("@via-ds/")) return;
      if (!resolveSpecifier(match[1])) {
        unresolved.push(`${match[1]} (${file}:${block.startLine + idx})`);
      }
    });
  }
  return unresolved.length
    ? { status: "FAIL", details: unresolved.join(", ") }
    : { status: "PASS", details: "all @via-ds imports resolve" };
}

// ---------------------------------------------------------------------------
// examples-render: precheck, resolution, type-check, render
// ---------------------------------------------------------------------------

function classifyExampleBlock(block) {
  const lines = block.code.split("\n");
  const hasExport = EXPORT_DEFAULT_RE.test(block.code);
  const hasDisallowed = lines.some((line) => DISALLOWED_IMPORT_RE.test(line));
  if (!hasExport || hasDisallowed) {
    return { kind: "invalid", reason: "not a self-contained module" };
  }
  const unresolved = importSpecifiers(block.code).find(
    (spec) => !isRelative(spec) && !resolveSpecifier(spec),
  );
  if (unresolved) return { kind: "skip", package: unresolved };
  return { kind: "check" };
}

function writeExampleModule(dir, name, code) {
  const filePath = path.join(dir, name);
  const needsClient = !/^\s*['"]use client['"]/.test(code);
  fs.writeFileSync(filePath, needsClient ? `"use client";\n${code}` : code);
  return { filePath, lineOffset: needsClient ? 1 : 0 };
}

function typeCheckExamples(modules) {
  const tempDir = fs.mkdtempSync(path.join(REPO_ROOT, ".guide-check-"));
  registerCleanup(tempDir);

  const pathToModule = new Map();
  for (const example of modules) {
    const written = writeExampleModule(tempDir, example.name, example.code);
    example.absolutePath = written.filePath;
    example.lineOffset = written.lineOffset;
    pathToModule.set(written.filePath, example);
  }

  const args = [
    TSC_BIN,
    "--noEmit",
    "--allowJs",
    "--checkJs",
    "--jsx",
    "react-jsx",
    "--module",
    "esnext",
    "--moduleResolution",
    "bundler",
    "--target",
    "es2022",
    "--skipLibCheck",
    ...modules.map((example) => example.absolutePath),
  ];
  const result = spawnSync(process.execPath, args, {
    cwd: REPO_ROOT,
    encoding: "utf8",
  });
  const output = `${result.stdout || ""}${result.stderr || ""}`;

  const errorsByModule = new Map();
  for (const line of output.split("\n")) {
    const match = line.match(/^(.*?)\((\d+),\d+\): error (TS\d+): (.*)$/);
    if (!match) continue;
    // tsc reports paths relative to its working directory (the repo root).
    const example = pathToModule.get(path.resolve(REPO_ROOT, match[1]));
    if (!example) continue;
    const guideLine = example.startLine + (Number(match[2]) - 1) - example.lineOffset;
    if (!errorsByModule.has(example)) errorsByModule.set(example, []);
    errorsByModule.get(example).push(`${match[3]} at ${example.file}:${guideLine}`);
  }

  // A nonzero exit with no diagnostics mapped to an example (spawn failure,
  // bad flag, tsc crash, ...) must not be reported as a pass.
  let failure = null;
  if (result.status !== 0 && errorsByModule.size === 0) {
    const reason = result.error
      ? result.error.message
      : output.split("\n").map((line) => line.trim()).filter(Boolean).slice(-5).join(" | ");
    failure = `tsc exited with status ${result.status}: ${reason || "no output"}`.slice(0, 600);
  }
  return { errorsByModule, failure };
}

function renderExamples(modules) {
  // Use a fresh, uniquely named route so an existing directory under
  // src/app/ is never overwritten or deleted.
  const guideCheckDir = fs.mkdtempSync(GUIDE_CHECK_PREFIX);
  registerCleanup(guideCheckDir);
  const buildDir = fs.mkdtempSync(path.join(REPO_ROOT, ".guide-check-build-"));
  registerCleanup(buildDir);

  const imports = [];
  const renders = [];
  modules.forEach((_module, index) => {
    const component = `Example${index}`;
    writeExampleModule(guideCheckDir, `example-${index}.jsx`, _module.code);
    imports.push(`import ${component} from "./example-${index}.jsx";`);
    renders.push(`      <${component} />`);
  });
  const page = [
    '"use client";',
    "",
    ...imports,
    "",
    "export default function GuideCheckPage() {",
    "  return (",
    "    <div>",
    ...renders,
    "    </div>",
    "  );",
    "}",
    "",
  ].join("\n");
  fs.writeFileSync(path.join(guideCheckDir, "page.js"), page);

  const result = spawnSync(
    "npx",
    ["next", "build", "--turbopack", "--no-lint"],
    {
      cwd: REPO_ROOT,
      encoding: "utf8",
      env: {
        ...process.env,
        GUIDE_CHECK_DIST_DIR: path.relative(REPO_ROOT, buildDir),
      },
    },
  );
  if (result.status === 0) return { ok: true };
  const output = `${result.stdout || ""}${result.stderr || ""}`.replace(
    /\u001b\[[0-9;]*m/g,
    "",
  );
  const tail = output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(-12)
    .join(" | ");
  return { ok: false, details: tail.slice(0, 600) };
}

function runExamplesRenderCheck(sectionsWithBlocks, noRender) {
  // Collect the blocks to type-check across every selected section, while
  // keeping a per-section tally of failures and skips.
  const modules = [];
  const perSection = new Map(); // section -> { failures, skipped, hasJsx }

  for (const { section, blocks } of sectionsWithBlocks) {
    const entry = { failures: [], skipped: [], hasJsx: false };
    perSection.set(section, entry);

    for (const block of blocks.filter((candidate) => candidate.lang === "jsx")) {
      entry.hasJsx = true;
      const classification = classifyExampleBlock(block);
      if (classification.kind === "invalid") {
        entry.failures.push(`${section.file}:${block.startLine}: not a self-contained module`);
      } else if (classification.kind === "skip") {
        entry.skipped.push(classification.package);
      } else {
        modules.push({
          file: section.file,
          startLine: block.startLine,
          code: block.code,
          section,
          name: `example-${modules.length}.jsx`,
        });
      }
    }
  }

  if (modules.length > 0) {
    const { errorsByModule, failure } = typeCheckExamples(modules);
    for (const example of modules) {
      const errors = errorsByModule.get(example);
      if (errors) perSection.get(example.section).failures.push(...errors);
      if (failure) perSection.get(example.section).failures.push(failure);
    }
    if (!noRender) {
      const build = renderExamples(modules);
      if (!build.ok) {
        for (const example of modules) {
          perSection.get(example.section).failures.push(`next build failed: ${build.details}`);
        }
      }
    }
  }

  // Finalize one status per section.
  const results = new Map();
  for (const { section } of sectionsWithBlocks) {
    const entry = perSection.get(section);
    if (!entry.hasJsx) {
      results.set(section, { status: "PASS", details: "no jsx examples" });
    } else if (entry.failures.length) {
      results.set(section, { status: "FAIL", details: entry.failures.join("; ") });
    } else if (entry.skipped.length) {
      results.set(section, {
        status: "SKIP",
        details: `unresolved package(s): ${[...new Set(entry.skipped)].join(", ")}`,
      });
    } else {
      results.set(section, {
        status: "PASS",
        details: "examples type-check" + (noRender ? "" : " and render"),
      });
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const options = parseArgs(process.argv.slice(2));
  const usingDefaults = options.files.length === 0;
  const files = usingDefaults ? DEFAULT_FILES : options.files;

  if (!fs.existsSync(TYPESCRIPT_DIR)) {
    fail(
      `typescript is not installed at ${TYPESCRIPT_DIR}; run \`npm install\` first`,
    );
  }

  const onlySet = new Set(options.only.map((value) => value.trim().toLowerCase()));
  const definedTokens = loadDefinedTokens();
  const rows = [];
  const availableHeadings = [];

  for (const file of files) {
    if (!fs.existsSync(file)) {
      if (usingDefaults) {
        process.stdout.write(`WARN  skipping missing default file  ${file}\n`);
        continue;
      }
      fail(`file not found: ${file}`);
    }

    const text = fs.readFileSync(file, "utf8");
    const { sections, blocks } = parseSections(text);
    for (const section of sections) availableHeadings.push({ file, heading: section.heading });

    let selected = sections;
    if (onlySet.size > 0) {
      selected = sections.filter((section) =>
        onlySet.has(section.heading.trim().toLowerCase()),
      );
    }

    const sectionsWithBlocks = selected.map((section) => {
      section.file = file;
      return {
        section,
        blocks: blocks.filter((block) => block.section === section),
      };
    });

    const renderResults = runExamplesRenderCheck(sectionsWithBlocks, options.noRender);

    for (const { section, blocks: sectionBlocks } of sectionsWithBlocks) {
      rows.push({
        check: "no-leafygreen",
        file,
        heading: section.heading,
        ...checkNoLeafygreen(section, file),
      });
      rows.push({
        check: "imports-resolve",
        file,
        heading: section.heading,
        ...checkImportsResolve(section, file, sectionBlocks),
      });
      rows.push({
        check: "tokens-exist",
        file,
        heading: section.heading,
        ...checkTokensExist(section, file, definedTokens),
      });
      rows.push({
        check: "no-literal-colors",
        file,
        heading: section.heading,
        ...checkNoLiteralColors(section, file),
      });
      rows.push({
        check: "examples-render",
        file,
        heading: section.heading,
        ...renderResults.get(section),
      });
    }
  }

  // Report one line per section per check, in the canonical check order.
  let passed = 0;
  let failed = 0;
  let skipped = 0;
  for (const row of rows) {
    if (row.status === "FAIL") failed += 1;
    else if (row.status === "SKIP") skipped += 1;
    else passed += 1;
    process.stdout.write(
      `${row.status}  ${row.check}  ${row.file} § ${row.heading}  ${row.details}\n`,
    );
  }

  process.stdout.write(
    `\nSummary: ${passed} PASS, ${failed} FAIL, ${skipped} SKIP\n`,
  );

  // A --only value that matches no section would silently run zero checks, so
  // treat it as an error rather than a pass.
  const matchedHeadings = new Set(
    availableHeadings.map(({ heading }) => heading.trim().toLowerCase()),
  );
  const unmatchedOnly = options.only.filter(
    (value) => !matchedHeadings.has(value.trim().toLowerCase()),
  );
  if (unmatchedOnly.length > 0) {
    for (const value of unmatchedOnly) {
      process.stdout.write(`ERROR  --only "${value}" matched no section\n`);
    }
    const listing = availableHeadings
      .map(({ file, heading }) => `${file} § ${heading}`)
      .join(", ");
    process.stdout.write(`Available sections: ${listing}\n`);
  }

  process.exit(failed > 0 || unmatchedOnly.length > 0 ? 1 : 0);
}

main();
