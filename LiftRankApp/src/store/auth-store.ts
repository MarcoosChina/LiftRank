import { create } from 'zustand';

interface AuthState {
  userId: number | null;
  userName: string | null;
  userEmail: string | null;
  setSession: (user: { id: number; name: string; email: string } | null) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  userId: null,
  userName: null,
  userEmail: null,
  setSession: (user) =>
    set({
      userId: user?.id ?? null,
      userName: user?.name ?? null,
      userEmail: user?.email ?? null,
    }),
  clearSession: () =>
    set({
      userId: null,
      userName: null,
      userEmail: null,
    }),
}));
