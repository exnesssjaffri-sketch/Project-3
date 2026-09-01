import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Trello Clone',
  description: 'Real-time collaborative Trello clone built with Next.js 14, Socket.io,, and a JSON-file backend on Render.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 antialiased">{children}</body>
    </html>
  );
}