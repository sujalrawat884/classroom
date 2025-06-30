import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';
import { toast } from 'react-toastify';

interface User {
  id: string;
  username: string;
  email: string;
  is_admin: boolean;
  is_active: boolean;
  created_at: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

// Configure axios defaults
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: true,
      isLoading: false,

      login: async (username: string, password: string) => {
        set({ isLoading: true });
        try {
          const formData = new FormData();
          formData.append('username', username);
          formData.append('password', password);

          const response = await axiosInstance.post('/api/auth/token', formData, {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          });

          const { access_token, user_id, username: returnedUsername, is_admin } = response.data;

          // Get full user details
          const userResponse = await axiosInstance.get('/api/auth/users/me', {
            headers: {
              Authorization: `Bearer ${access_token}`,
            },
          });

          const user = userResponse.data;

          // Update axios default headers
          axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;

          set({
            user,
            token: access_token,
            isAuthenticated: true,
            isLoading: false,
          });

          toast.success('Login successful!');
          return true;
        } catch (error: any) {
          console.error('Login error:', error);
          const errorMessage = error.response?.data?.detail || 'Login failed';
          toast.error(errorMessage);
          set({ isLoading: false });
          return false;
        }
      },

      logout: () => {
        // Clear axios authorization header
        delete axiosInstance.defaults.headers.common['Authorization'];
        
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
        });
        
        toast.info('Logged out successfully');
      },

      checkAuth: async () => {
        const { token } = get();
        if (!token) {
          set({ isAuthenticated: false });
          return;
        }

        try {
          // Set authorization header
          axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          const response = await axiosInstance.get('/api/auth/users/me');
          const user = response.data;

          set({
            user,
            isAuthenticated: true,
          });
        } catch (error) {
          console.error('Auth check failed:', error);
          // Clear invalid token
          delete axiosInstance.defaults.headers.common['Authorization'];
          set({
            user: null,
            token: null,
            isAuthenticated: false,
          });
        }
      },

      refreshUser: async () => {
        const { token } = get();
        if (!token) return;

        try {
          const response = await axiosInstance.get('/api/auth/users/me', {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          
          set({ user: response.data });
        } catch (error) {
          console.error('Failed to refresh user:', error);
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Export configured axios instance for use in other parts of the app
export { axiosInstance };
