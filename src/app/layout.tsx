import "./globals.css";
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';

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
          <div className="max-w-7xl mx-auto">
            <Link href="/" className="text-xl font-bold text-blue-600">
              ChatGenius
            </Link>
          </div>
        </nav>
        <div className="pt-16">
          {children}
        </div>
      </body>
    </html>
  );
} 