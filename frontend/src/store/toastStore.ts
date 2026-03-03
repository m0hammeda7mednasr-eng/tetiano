/**
 * Toast notification system for Frontend
 */

import { create } from "zustand";

export type ToastType = "success" | "error" | "warning" | "info";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastState {
  toasts: Toast[];
  addToast: (message: string, type: ToastType, duration?: number) => string;
  removeToast: (id: string) => void;
  clearAll: () => void;
}

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],

  addToast: (message: string, type: ToastType, duration: number = 5000) => {
    const id = Date.now().toString();
    const toast: Toast = { id, message, type, duration };

    set((state) => ({
      toasts: [...state.toasts, toast],
    }));

    if (duration !== 0) {
      setTimeout(() => get().removeToast(id), duration);
    }

    return id;
  },

  removeToast: (id: string) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  clearAll: () => {
    set({ toasts: [] });
  },
}));

// Convenience functions
export const toast = {
  success: (message: string, duration?: number) =>
    useToastStore.getState().addToast(message, "success", duration),
  error: (message: string, duration?: number) =>
    useToastStore.getState().addToast(message, "error", duration),
  warning: (message: string, duration?: number) =>
    useToastStore.getState().addToast(message, "warning", duration),
  info: (message: string, duration?: number) =>
    useToastStore.getState().addToast(message, "info", duration),
};
