import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.EXAMIO_NEXT_DIST_DIR || ".next",
  reactCompiler: true,
};

export default nextConfig;
