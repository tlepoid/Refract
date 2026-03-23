import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Refract',
  description: 'AI Agent Design Workbench',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
