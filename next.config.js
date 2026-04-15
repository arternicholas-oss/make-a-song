/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // ── ffmpeg on Vercel serverless ───────────────────────────────────────────
  // The /api/preview/generate route uses fluent-ffmpeg + ffmpeg-static to clip
  // the Lyria-generated audio down to a 20s preview. Without these two configs
  // Next.js tries to inline ffmpeg-static into a JS chunk, which strips the
  // actual binary and produces ENOENT at runtime ("spawn /var/task/.next/
  // server/chunks/ffmpeg ENOENT"). The fix is two-part:
  //
  //   1) Mark fluent-ffmpeg + ffmpeg-static as external — keep them as runtime
  //      requires so the binary path resolution still works.
  //   2) Explicitly include the platform binary in the function trace so it
  //      ships in the deployment bundle.
  serverExternalPackages: ['fluent-ffmpeg', 'ffmpeg-static'],
  outputFileTracingIncludes: {
    '/api/preview/generate': [
      './node_modules/ffmpeg-static/ffmpeg',
    ],
  },
  headers: async () => [
    {
      source: '/sw.js',
      headers: [
        {
          key: 'Cache-Control',
          value: 'no-cache, no-store, must-revalidate',
        },
        {
          key: 'Service-Worker-Allowed',
          value: '/',
        },
      ],
    },
    {
      source: '/manifest.json',
      headers: [
        {
          key: 'Cache-Control',
          value: 'no-cache',
        },
      ],
    },
    // Universal Links — Apple requires application/json Content-Type and
    // no redirects on this path. Must be served from the apex domain.
    {
      source: '/.well-known/apple-app-site-association',
      headers: [
        { key: 'Content-Type', value: 'application/json' },
        { key: 'Cache-Control', value: 'public, max-age=3600' },
      ],
    },
    // Android App Links — Google's verification fetches this as JSON.
    {
      source: '/.well-known/assetlinks.json',
      headers: [
        { key: 'Content-Type', value: 'application/json' },
        { key: 'Cache-Control', value: 'public, max-age=3600' },
      ],
    },
  ],
}

module.exports = nextConfig
