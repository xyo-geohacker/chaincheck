import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { setAuthHeader } from '../services/api.service';

type DriverState = {
  driverId: string | null;
  token: string | null;
  setDriverId: (driverId: string) => void;
  setToken: (token: string | null) => void;
  clearDriver: () => void;
};

export const useDriverStore = create(
  persist<DriverState>(
    (set) => ({
      driverId: null,
      token: null,
      setDriverId: (driverId) => set({ driverId }),
      setToken: (token) => {
        set({ token });
        // Update API client auth header when token changes
        setAuthHeader(token);
      },
      clearDriver: () => {
        set({ driverId: null, token: null });
        // Clear auth header when logging out
        setAuthHeader(null);
      }
    }),
    {
      name: 'chaincheck-driver',
      storage: createJSONStorage(() => AsyncStorage),
      // Initialize auth header when store is rehydrated
      onRehydrateStorage: () => (state) => {
        if (state?.token) {
          setAuthHeader(state.token);
        }
      }
    }
  )
);

