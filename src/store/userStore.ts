import { create } from 'zustand';

type UserStore = {
  avatar: string;
  setAvatar: (url: string) => void;
  resetAvatar: () => void;
};

export const useUserStore = create<UserStore>((set) => ({
  avatar: '/defpropic.jpg',
  setAvatar: (url) => set({ avatar: url }),
  resetAvatar: () => set({ avatar: '/defpropic.jpg' }),
}));
