import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = { title:'Gig Log', description:'Your life in live music' };
export default function RootLayout({children}:{children:React.ReactNode}){
 return <html lang="en"><body>{children}</body></html>;
}
