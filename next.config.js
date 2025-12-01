/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.r2.dev',
      },
    ],
  },

  webpack: (config, { isServer }) => {
    // Ignore non-JS files that webpack shouldn't process
    config.module.rules.push({
      test: /\.(md|txt|LICENSE|node)$/,
      use: 'ignore-loader',
    });

    // Ignore TypeScript declaration files
    config.module.rules.push({
      test: /\.d\.ts$/,
      use: 'ignore-loader',
    });

    // External configuration for server-side to prevent bundling native modules
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        '@libsql/linux-x64-gnu': 'commonjs @libsql/linux-x64-gnu',
        '@libsql/linux-x64-musl': 'commonjs @libsql/linux-x64-musl',
        '@libsql/darwin-x64': 'commonjs @libsql/darwin-x64',
        '@libsql/darwin-arm64': 'commonjs @libsql/darwin-arm64',
        '@libsql/win32-x64-msvc': 'commonjs @libsql/win32-x64-msvc',
        'better-sqlite3': 'commonjs better-sqlite3',
      });
    }

    return config;
  },
};

module.exports = nextConfig;
