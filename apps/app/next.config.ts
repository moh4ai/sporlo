import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  transpilePackages: [
    "@sporlo/ui",
    "@sporlo/auth",
    "@sporlo/db",
    "@sporlo/governance",
    "@sporlo/i18n",
    "@sporlo/shared",
  ],
};

export default withNextIntl(nextConfig);
