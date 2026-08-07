/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingIncludes: {
    '/api/**/*': [
      './node_modules/jimp/fonts/**/*',
      './node_modules/@jimp/plugin-print/fonts/**/*'
    ],
  },
};

export default nextConfig;
