import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Remotion-Bundler/Renderer + Konva werden nur zur Laufzeit auf dem Mac
  // geladen (siehe src/app/api/render-video/route.ts). Sie enthalten native
  // Binärdateien (esbuild, headless-shell, canvas) — Turbopack darf sie nicht
  // ins Bundle ziehen, sonst bricht der Build mit „Reading source code failed".
  serverExternalPackages: [
    '@remotion/bundler',
    '@remotion/renderer',
    '@remotion/compositor-darwin-arm64',
    '@remotion/compositor-darwin-x64',
    '@remotion/compositor-linux-x64-gnu',
    '@remotion/compositor-linux-x64-musl',
    '@remotion/compositor-linux-arm64-gnu',
    '@remotion/compositor-linux-arm64-musl',
    '@remotion/compositor-win32-x64-msvc',
    'esbuild',
  ],
}

export default nextConfig
