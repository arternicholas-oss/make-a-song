/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required to allow Stripe webhook raw body parsing
  api: {
    bodyParser: false,
  },
}

module.exports = nextConfig
