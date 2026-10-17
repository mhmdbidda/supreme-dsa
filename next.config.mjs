/**
 * Default Next.js config. The app is fully static (every route prerenders,
 * no server-only APIs), so it deploys to Vercel's build output as-is — no
 * custom `output` or rewrites are required. `headers()` below hardens EVERY
 * route (`/(.*)`) with clickjacking / MIME-sniffing / referrer protections
 * and a conservative Content-Security-Policy.
 *
 * The CSP allows exactly what this app needs and nothing else:
 * - `'self'` everywhere: Next's chunks, stylesheets, self-hosted fonts and
 *   the RSC prefetches are all same-origin,
 * - `script-src 'unsafe-inline'` because the App Router ships its flight /
 *   bootstrap scripts INLINE and static headers cannot attach a per-request
 *   nonce,
 * - `style-src 'unsafe-inline'` because React writes inline `style`
 *   attributes (progress bars, chart bars, canvas affordances),
 * - `img-src data:` for the grain overlay / panel noise, which is a `data:`
 *   SVG URI in `src/app/globals.css`.
 * No external origins: nothing on any page loads from a third party, so no
 * `https:` wildcard is needed.
 *
 * @type {import('next').NextConfig}
 */
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "manifest-src 'self'",
  "worker-src 'self'",
].join("; ");

const nextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Content-Security-Policy", value: CONTENT_SECURITY_POLICY },
        ],
      },
    ];
  },
};

export default nextConfig;
