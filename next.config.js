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
  // Transpile libsql packages for compatibility
  transpilePackages: ['@libsql/client', '@libsql/kysely-libsql', 'kysely'],

  webpack: (config, { isServer }) => {
    // Exclude non-JS files from webpack processing
    config.module.rules.push({
      test: /\.(md|txt|d\.ts)$/,
      type: 'asset/source',
    });

    // Ignore TypeScript declaration files
    config.module.rules.push({
      test: /\.d\.ts$/,
      use: 'ignore-loader',
    });

    return config;
  },
};

module.exports = nextConfig;
