import "./globals.css";
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { Navbar } from '@/components/Navbar';

export const metadata = {
  title: 'ChatGenius',
  description: 'AI-powered chat application',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  return (
    <html lang="en">
      <head>
        <link rel="icon" type="image/png" href="/logo.png" />
        {/* Add both PNG and ICO for maximum compatibility */}
        <link rel="shortcut icon" href="/logo.png" />
      </head>
      <body>
        <Navbar />
        <div className="pt-16">
          {children}
        </div>
      </body>
    </html>
  );
} 