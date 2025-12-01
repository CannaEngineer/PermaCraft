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
    // Exclude non-JS files from webpack processing
    config.module.rules.push({
      test: /\.(md|txt)$/,
      type: 'asset/source',
    });

    return config;
  },
};

module.exports = nextConfig;
