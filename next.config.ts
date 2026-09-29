import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const TECHNICAL_UPLOAD_LIMIT = "10mb";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-pg", "pg"],
  outputFileTracingIncludes: {
    "/*": ["./src/generated/prisma/**/*", "./prisma/**/*"],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: TECHNICAL_UPLOAD_LIMIT,
    },
  },
  async headers() {
    const isProd = process.env.NODE_ENV === "production";
    const enableHsts = process.env.ENABLE_HSTS === "true";
    const scriptSrc = isProd
      ? "script-src 'self' 'unsafe-inline'"
      : "script-src 'self' 'unsafe-inline' 'unsafe-eval'";
    const csp = [
      "default-src 'self'",
      scriptSrc,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self'",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join("; ");

    const headers = [
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=()",
      },
      { key: "X-DNS-Prefetch-Control", value: "off" },
      { key: "Content-Security-Policy", value: csp },
    ];

    if (isProd && enableHsts) {
      headers.push({
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains",
      });
    }

    return [{ source: "/:path*", headers }];
  },
};

export default withNextIntl(nextConfig);
