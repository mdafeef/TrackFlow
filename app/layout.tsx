import type {Metadata} from 'next';
import {Plus_Jakarta_Sans, JetBrains_Mono} from 'next/font/google';
import './globals.css';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jakarta',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'TrackFlow - Universal Multi-Carrier Tracker',
  description: 'Fast, free parcel and shipment tracking for 20+ carriers including India Post Speed Post, DTDC, Ekart, Delhivery, BlueDart, and international postal networks.',
  openGraph: {
    title: 'TrackFlow - Universal Multi-Carrier Tracker',
    description: 'Fast, free parcel tracking for 20+ carriers with live journey route maps, delivery estimates, and instant WhatsApp status cards.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TrackFlow - Universal Multi-Carrier Tracker',
    description: 'Fast, free parcel tracking for 20+ carriers with live journey route maps, delivery estimates, and instant WhatsApp status cards.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={`${jakarta.variable} ${jetbrainsMono.variable} antialiased overflow-x-hidden max-w-full`} suppressHydrationWarning>
      <body className="min-h-screen w-full max-w-full overflow-x-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 selection:bg-indigo-500 selection:text-white" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}

