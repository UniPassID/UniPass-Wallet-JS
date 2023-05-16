import { UnipassStorage } from "../interface/storage";

export const LocalUnipassStorage: UnipassStorage = {
  getItem: async (key: string) => localStorage.getItem(key) || undefined,
  removeItem: async (key: string) => localStorage.removeItem(key),
  setItem: async (key: string, value: string) => localStorage.setItem(key, value),
};
