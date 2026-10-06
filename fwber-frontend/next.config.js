// This file configures the initialization of Sentry for edge features (middleware, edge routes, and pages router).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

const fs = require('fs')
const path = require('path')

// Read versions
const getVersion = () => {
  try {
    return fs.readFileSync(path.join(__dirname, '../VERSION'), 'utf8').trim()
  } catch (e) {
    return '0.0.0-unknown'
  }
}

const getBackendVersion = () => {
  try {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(__dirname, '../fwber-backend-ts/package.json'), 'utf8')
    )
    return pkg.version
  } catch (e) {
    return '0.0.0-unknown'
  }
}

const getFrontendVersion = () => {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'))
    return pkg.version
  } catch (e) {
    return '0.0.0-unknown'
  }
}

const { withSentryConfig } = (() => {
  try {
    return require('@sentry/nextjs')
  } catch {
    return { withSentryConfig: (c) => c }
  }
})()
const withPWA = (config) => config // Passthrough until PWA is fixed

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  // outputFileTracingRoot only works in monorepo; Vercel builds fwber-frontend/ as root
  ...(fs.existsSync(path.join(__dirname, '../VERSION'))
    ? { outputFileTracingRoot: path.join(__dirname, '../') }
    : {}),

  // Standalone output for self-contained Hetzner deployment
  output: 'standalone',

  // Performance optimizations
  compress: true,
  poweredByHeader: false,
  productionBrowserSourceMaps: false,

  // Environment variables
  env: {
    NEXT_PUBLIC_PROJECT_VERSION: getVersion(),
    NEXT_PUBLIC_BACKEND_VERSION: getBackendVersion(),
    NEXT_PUBLIC_FRONTEND_VERSION: getFrontendVersion(),
  },

  // Experimental features for better performance
  experimental: {
    optimizeCss: false,
    optimizePackageImports: ['@tanstack/react-query', 'lucide-react'],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },

  // Image optimization
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'api.fwber.site' },
      { protocol: 'https', hostname: 'fwber.site' },
      { protocol: 'https', hostname: 'www.fwber.site' },
      { protocol: 'https', hostname: '**.amazonaws.com' },
      { protocol: 'https', hostname: '**.cloudfront.net' },
      { protocol: 'https', hostname: 'oaidalleapiprodscus.blob.core.windows.net' },
      { protocol: 'https', hostname: '**.googleapis.com' },
      { protocol: 'https', hostname: 'api.dicebear.com' },
      { protocol: 'http', hostname: '127.0.0.1', port: '8002', pathname: '/files/**' },
      { protocol: 'http', hostname: '127.0.0.1', port: '8002', pathname: '/storage/**' },
      { protocol: 'http', hostname: 'localhost', port: '8002', pathname: '/files/**' },
      { protocol: 'http', hostname: 'localhost', port: '8002', pathname: '/storage/**' },
      { protocol: 'http', hostname: 'localhost', port: '8002', pathname: '/images/**' },
      { protocol: 'http', hostname: '127.0.0.1', port: '4003', pathname: '/**' },
      { protocol: 'http', hostname: 'localhost', port: '4003', pathname: '/**' },
      { protocol: 'http', hostname: 'localhost', port: '8000', pathname: '/**' },
    ],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    unoptimized: process.env.NODE_ENV === 'development',
  },

  // Bundle optimization
  webpack: (config, { dev, isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        encoding: false,
      }
    }

    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      { module: /node_modules\/@vladmandic\/face-api/ },
      { module: /node_modules\/zustand/ },
    ]

    return config
  },

  // Unified Headers Method
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Content-Security-Policy',
            value:
              "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' blob: https://js.stripe.com; worker-src 'self' blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https://api.fwber.site https://*.amazonaws.com https://*.cloudfront.net https://oaidalleapiprodscus.blob.core.windows.net https://*.googleapis.com; font-src 'self' https://fonts.gstatic.com https://fonts.googleapis.com; connect-src 'self' https://api.fwber.site wss://ws.fwber.site wss://ws.fwber.site/socket.io/ https://*.sentry.io https://www.fwber.site https://api.stripe.com https://nominatim.openstreetmap.org; frame-src 'self' https://js.stripe.com https://hooks.stripe.com; frame-ancestors 'self' https://fwber.site https://www.fwber.site; media-src 'self' blob:;",
          },
          { key: 'X-Content-Type-Options', value: '' }, // Neutralize legacy block

          { key: 'Content-Security-Policy', value: 'frame-ancestors *' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(self), geolocation=(self)',
          },
        ],
      },
      {
        source: '/static/(.*)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        source: '/_next/static/(.*)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        source: '/fonts/(.*)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        source: '/images/(.*)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, must-revalidate' }],
      },
    ]
  },

  async rewrites() {
    return [
      {
        source: '/api/:path((?!sentry-tunnel).*)',
        destination: 'https://api.fwber.site/api/:path*',
      },
      {
        source: '/.well-known/webfinger',
        destination: 'https://api.fwber.site/.well-known/webfinger',
      },
      {
        source: '/.well-known/nodeinfo',
        destination: 'https://api.fwber.site/.well-known/nodeinfo',
      },
    ]
  },
}

const sentryWebpackPluginOptions = {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  hideSourceMaps: true,
}

// Wrap config — Sentry only if available, bundle analyzer passthrough
const isProd = process.env.NODE_ENV === 'production'
let finalConfig = withPWA(withBundleAnalyzer(nextConfig))
if (isProd && withSentryConfig !== ((c) => c)) {
  try {
    finalConfig = withSentryConfig(finalConfig, sentryWebpackPluginOptions)
  } catch (e) {
    console.warn('[next.config] Sentry wrapping failed, using base config:', e.message)
  }
}

module.exports = finalConfig
module.exports = withSentryConfig(nextConfig, sentryWebpackPluginOptions)
