import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Session =
  | { role: 'admin'; token: string }
  | { role: 'user'; token: string; user: { id: string; alias: string } }
  | null;

type SessionStore = {
  session: Session;
  setSession: (s: Session) => void;
  logout: () => void;
};

export const useSessionStore = create<SessionStore>()(
  persist(
    (set) => ({
      session: null,
      setSession: (s) => set({ session: s }),
      logout: () => set({ session: null }),
    }),
    { name: 'office_booking_session' }
  )
);
