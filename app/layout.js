import { Inter, Outfit } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-heading",
  subsets: ["latin"],
});

export const metadata = {
  metadataBase: new URL('https://docsevents.com'),
  title: {
    default: "DÖCS | Eventos",
    template: "%s | DÖCS",
  },
  description: "DOCS - La experiencia definitiva en fiestas electrónicas underground. Compra tus entradas, escucha nuestros sets y sé parte de la comunidad.",
  keywords: ["DOCS", "DÖCS", "fiestas electrónicas", "música electrónica", "tickets", "eventos", "Caracas", "Venezuela", "underground"],
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    title: "DÖCS | Eventos",
    description: "DOCS - La experiencia definitiva en fiestas electrónicas underground.",
    url: "https://docsevents.com",
    siteName: "DÖCS Events",
    locale: "es_VE",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "DÖCS | Eventos",
    description: "DOCS - La experiencia definitiva en fiestas electrónicas underground.",
  },
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="es"
      className={`${inter.variable} ${outfit.variable}`}
    >
      <head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      </head>
      <body>{children}</body>
    </html>
  );
}
