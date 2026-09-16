export default function robots() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://docsevents.com';

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin',
        '/admin/',
        '/scanner',
        '/scanner/',
        '/api/',
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
