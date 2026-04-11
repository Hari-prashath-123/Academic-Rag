import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  onDemandEntries: {
    // Keep more pages warm in dev to reduce recompiles while navigating.
    maxInactiveAge: 15 * 60 * 1000,
    pagesBufferLength: 25,
  },
  turbopack: {
    root: __dirname,
  },
}

export default nextConfig
