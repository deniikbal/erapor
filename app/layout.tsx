import './globals.css';
import type { Metadata } from 'next';
import { Toaster } from '@/components/ui/sonner';

export const metadata: Metadata = {
  title: 'ERAP+ | Interface Modern untuk e-Rapor',
  description: 'ERAP+ (e-Rapor Plus) - Interface modern dan mudah untuk mengakses data e-Rapor sekolah. Portal pintar untuk guru dan admin.',
  openGraph: {
    images: [
      {
        url: '/erap-logo.png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    images: [
      {
        url: '/erap-logo.png',
      },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Google+Sans+Flex:opsz,wght@6..144,1..1000&display=swap" rel="stylesheet" />
      </head>
      <body style={{ fontFamily: '"Google Sans Flex", sans-serif' }}>
        {children}
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
