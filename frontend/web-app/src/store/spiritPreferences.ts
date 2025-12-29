import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SpiritPreferences {
  notifications: {
    p0: boolean; // Critical (Risk)
    p1: boolean; // High (Signals)
    p2: boolean; // Normal (Execution)
  };
  soundEnabled: boolean;
  
  toggleNotification: (priority: 'p0' | 'p1' | 'p2') => void;
  toggleSound: () => void;
}

export const useSpiritPreferences = create<SpiritPreferences>()(
  persist(
    (set) => ({
      notifications: {
        p0: true,
        p1: true,
        p2: false
      },
      soundEnabled: true,

      toggleNotification: (priority) => set((state) => ({
        notifications: {
          ...state.notifications,
          [priority]: !state.notifications[priority]
        }
      })),

      toggleSound: () => set((state) => ({
        soundEnabled: !state.soundEnabled
      }))
    }),
    {
      name: 'spirit-preferences', // local storage key
    }
  )
);


