import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
  durationMs?: number;
}

interface ToastState {
  currentToast: ToastMessage | null;
  showToast: (message: string, type?: ToastType, durationMs?: number) => void;
  hideToast: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  currentToast: null,
  showToast: (message, type = 'success', durationMs = 2500) => {
    const id = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    set({
      currentToast: { id, message, type, durationMs },
    });
  },
  hideToast: () => set({ currentToast: null }),
}));

export const toast = {
  success: (message: string, durationMs?: number) =>
    useToastStore.getState().showToast(message, 'success', durationMs),
  error: (message: string, durationMs?: number) =>
    useToastStore.getState().showToast(message, 'error', durationMs),
  info: (message: string, durationMs?: number) =>
    useToastStore.getState().showToast(message, 'info', durationMs),
};
