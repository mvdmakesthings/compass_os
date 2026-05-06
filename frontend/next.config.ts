import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["compass-v2.local", "compass-v2.local:8080"],
  // The `modules/` directory lives outside `frontend/`. tsconfig `paths` plus a
  // permissive output trace let Next compile module pages re-exported from there.
  outputFileTracingRoot: __dirname + "/..",
};

export default nextConfig;
