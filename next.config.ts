import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["sqlite3"],
  outputFileTracingIncludes: {
    "/*": ["./db/migrations/**/*.sql"],
  },
};

export default nextConfig;
