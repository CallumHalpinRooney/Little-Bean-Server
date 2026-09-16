/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    // All imagery on this site is inline SVG by design; unoptimized keeps the
    // build static-friendly if you switch to `output: 'export'`.
    unoptimized: true,
  },
};

export default nextConfig;
