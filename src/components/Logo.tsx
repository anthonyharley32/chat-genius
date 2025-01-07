import Image from 'next/image';
import Link from 'next/link';

interface LogoProps {
  className?: string;
}

export function Logo({ className = '' }: LogoProps) {
  return (
    <Link href="/" className={className}>
      <Image
        src="/logo.png"
        alt="Chat Genius Logo"
        width={40}
        height={40}
        className="w-auto h-auto"
        priority
      />
    </Link>
  );
} 