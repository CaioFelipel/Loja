import { create } from 'zustand';
import { setAuthToken } from '../lib/api';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'CAIXA';
}

interface AuthState {
  user: User | null;
  token: string | null;
  setUser: (user: User | null) => void;
  setSession: (user: User | null, token?: string | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  setUser: (user) => set({ user }),
  setSession: (user, token = null) => {
    setAuthToken(token);
    set({ user, token });
  },
  logout: () => {
    setAuthToken(null);
    set({ user: null, token: null });
  },
}));
