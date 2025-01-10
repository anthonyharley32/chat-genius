export const statusType = {
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

export type StatusType = keyof typeof statusType; 