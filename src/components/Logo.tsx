import Image from 'next/image';

interface LogoProps {
  className?: string;
}

export function Logo({ className = '' }: LogoProps) {
  return (
    <Image
      src="/logo.png"
      alt="Chat Genius Logo"
      width={40}
      height={40}
      className={`w-auto h-auto ${className}`}
      priority
    />
  );
} 