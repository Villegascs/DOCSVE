/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['firebase-admin', 'node-telegram-bot-api'],
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
