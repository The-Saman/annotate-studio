import path from 'node:path';
import type { NextConfig } from 'next';

const isProd = process.env.NODE_ENV === 'production';

const SINGLETONS = ['@lezer/highlight', '@lezer/common', '@lezer/lr', '@codemirror/state', '@codemirror/view', '@codemirror/language'];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: isProd ? 'export' : undefined,
  distDir: isProd ? 'dist' : undefined,
  images: {
    unoptimized: true,
  },
  devIndicators: false,
  webpack: (config) => {
    config.resolve = config.resolve ?? {};
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      ...Object.fromEntries(SINGLETONS.map((name) => [name, path.join(process.cwd(), 'node_modules', name)])),
    };
    return config;
  },
};

export default nextConfig;
