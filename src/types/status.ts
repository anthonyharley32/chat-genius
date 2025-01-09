export const STATUS_OPTIONS = {
  online: {
    color: 'bg-green-500',
    label: 'Online'
  },
  away: {
    color: 'bg-yellow-500',
    label: 'Away'
  },
  busy: {
    color: 'bg-red-500',
    label: 'Busy'
  },
  offline: {
    color: 'bg-gray-500',
    label: 'Offline'
  }
} as const;

console.log('STATUS_OPTIONS:', STATUS_OPTIONS);

export type StatusType = keyof typeof STATUS_OPTIONS; 