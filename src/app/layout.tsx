import "./globals.css";
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import { Logo } from '@/components/Logo';

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  return (
    <html lang="en">
      <body>
        <nav className="fixed top-0 left-0 right-0 p-4 bg-white shadow-sm z-10">
          <div className="max-w-7xl mx-auto flex items-center">
            <Logo className="w-8 h-8" />
            <span className="text-xl font-bold text-blue-600 ml-1">ChatGenius</span>
          </div>
        </nav>
        <div className="pt-16">
          {children}
        </div>
      </body>
    </html>
  );
} 