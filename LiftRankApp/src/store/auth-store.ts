import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { AsyncStorage } from 'expo-sqlite/kv-store';

const AUTH_STORAGE_KEY = 'liftrank:auth-session';

interface AuthState {
  userId: number | null;
  userName: string | null;
  userEmail: string | null;
  setSession: (user: { id: number; name: string; email: string } | null) => void;
  clearSession: () => void;
}

const sqliteStorage = {
  getItem: (key: string) => AsyncStorage.getItemSync(key),
  setItem: (key: string, value: string) => AsyncStorage.setItemSync(key, value),
  removeItem: (key: string) => AsyncStorage.removeItemSync(key),
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
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
    }),
    {
      name: AUTH_STORAGE_KEY,
      storage: createJSONStorage(() => sqliteStorage),
    },
  ),
);
