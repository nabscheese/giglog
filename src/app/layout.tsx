import './globals.css';
import type { Metadata } from 'next';
import { AuthProvider } from '@/components/AuthProvider';

export const metadata: Metadata = { title: 'GigLog', description: 'Remember every gig. Discover your next one.' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en" data-scroll-behavior="smooth"><body><AuthProvider>{children}</AuthProvider></body></html>;
}
