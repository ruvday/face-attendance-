import { create } from 'zustand';

interface User {
  id: string;
  email: string;
  role: string;
  tenant_id: string | null;
}

interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
}

const storedUser = localStorage.getItem('user');
const initialUser = storedUser ? JSON.parse(storedUser) : null;

export const useAuthStore = create<AuthState>((set) => ({
  user: initialUser,
  token: localStorage.getItem('token'),
  setAuth: (user, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    set({ user, token });
  },
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ user: null, token: null });
  },
}));
