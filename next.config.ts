import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Prevent Turbopack from inferring the wrong workspace root
  // when other lockfiles exist outside this project directory.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
