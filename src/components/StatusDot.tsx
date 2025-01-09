interface StatusDotProps {
  status: 'online' | 'away' | 'busy' | 'offline';
  size?: 'sm' | 'md' | 'lg';
}

export function StatusDot({ status, size = 'sm' }: StatusDotProps) {
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  };

  const colors = {
    online: 'bg-green-500',
    away: 'bg-yellow-500',
    busy: 'bg-red-500',
    offline: 'bg-gray-500'
  };

  return (
    <span className={`inline-block rounded-full ${sizeClasses[size]} ${colors[status]}`} />
  );
} 