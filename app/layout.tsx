import type {Metadata} from 'next';
import { IBM_Plex_Sans } from 'next/font/google';
import './globals.css'; // Global styles

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'Borracharia Pro - Workshop Management',
  description: 'Gerenciador completo de borracharias, alinhamento, calibragem e rodízios de pneus.',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="pt-BR" className={`${ibmPlexSans.variable}`}>
      <body suppressHydrationWarning className="font-sans antialiased text-brand-primary bg-surface-bg select-none">
        {children}
      </body>
    </html>
  );
}

