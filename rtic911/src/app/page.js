"use client";

import { Description, H1 } from "@via-ds/components/typography";
import AlertsDashboard from "@/components/alertsDashboard/AlertsDashboard";
import InfoWizard from "@/components/infoWizard/InfoWizard";

export default function Home() {
  return (
    <main className="min-h-screen px-8 py-6 flex flex-col gap-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <H1>RTIC 911</H1>
          <Description>Simulated emergency communications center · COVESA CVED demo</Description>
        </div>
        <InfoWizard />
      </header>
      <AlertsDashboard />
    </main>
  );
}
