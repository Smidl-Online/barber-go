import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'customer' | 'provider';
  phone?: string;
  avatar_url?: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  logout: () => void;
  loadStoredAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isLoading: true,

  setAuth: (user, accessToken, refreshToken) => {
    SecureStore.setItemAsync('accessToken', accessToken);
    SecureStore.setItemAsync('refreshToken', refreshToken);
    SecureStore.setItemAsync('user', JSON.stringify(user));
    set({ user, accessToken, refreshToken });
  },

  setTokens: (accessToken, refreshToken) => {
    SecureStore.setItemAsync('accessToken', accessToken);
    SecureStore.setItemAsync('refreshToken', refreshToken);
    set({ accessToken, refreshToken });
  },

  logout: () => {
    SecureStore.deleteItemAsync('accessToken');
    SecureStore.deleteItemAsync('refreshToken');
    SecureStore.deleteItemAsync('user');
    set({ user: null, accessToken: null, refreshToken: null });
  },

  loadStoredAuth: async () => {
    try {
      const [accessToken, refreshToken, userStr] = await Promise.all([
        SecureStore.getItemAsync('accessToken'),
        SecureStore.getItemAsync('refreshToken'),
        SecureStore.getItemAsync('user'),
      ]);

      if (accessToken && refreshToken && userStr) {
        const user = JSON.parse(userStr);
        set({ user, accessToken, refreshToken, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },
}));
