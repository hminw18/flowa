import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CI Messenger - Real-time Chat with Translation',
  description: 'Practice language learning through real-time 1:1 chat with translations',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
