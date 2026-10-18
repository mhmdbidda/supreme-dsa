/**
 * Site-wide constants used by metadata, the landing page footer and the
 * About page.
 *
 * Kept in one place so the site and repository URLs can be swapped without
 * touching any component or page.
 */

/**
 * Public site origin used to resolve absolute metadata URLs (Open Graph,
 * canonical links) and any other absolute link in the app.
 *
 * Defaults to the deployed site and can be overridden per environment with
 * `NEXT_PUBLIC_SITE_URL`.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://supreme-dsa.vercel.app";

/** Public repository URL shown in the landing page footer. */
export const GITHUB_URL = "https://github.com/mhmdbidda/supreme-dsa";