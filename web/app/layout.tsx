import type { Metadata } from 'next';
import { ReactNode } from 'react';

import { ClientProviders } from './client-providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'ChainCheck',
  icons: {
    icon: '/images/favicon.ico',
  },
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}

