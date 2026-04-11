import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { NotificationProvider } from '@/context/NotificationContext';
import { Analytics } from "@vercel/analytics/next"

export const metadata: Metadata = {
  title: 'CricketLive — Live Cricket Scores & Updates',
  description: 'Follow live cricket scores, scorecards, match schedules, and player stats in real-time.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <AuthProvider>
          <NotificationProvider>
            {children}
          </NotificationProvider>
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}
