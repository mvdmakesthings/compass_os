import path from "node:path";
import type { NextConfig } from "next";

const repoRoot = path.join(__dirname, "..");

const nextConfig: NextConfig = {
  allowedDevOrigins: ["compass-v2.local", "compass-v2.local:8080"],
  // The `modules/` directory lives outside `frontend/`. We hoist Turbopack's
  // project root up one level so module pages under `modules/<name>/frontend/`
  // can resolve bare imports (e.g. `@mantine/core`) against
  // `frontend/node_modules`. `outputFileTracingRoot` mirrors this so the
  // production tracing picks up the same files.
  turbopack: { root: repoRoot },
  outputFileTracingRoot: repoRoot,
};

export default nextConfig;
