/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.GUIDE_CHECK_DIST_DIR ?? ".next",
};

export default nextConfig;
