import { IStorage } from "../interface/storage";

export const LocalStorage: IStorage = {
  getItem: async (key: string) => localStorage.getItem(key) || undefined,
  removeItem: async (key: string) => localStorage.removeItem(key),
  setItem: async (key: string, value: string) => localStorage.setItem(key, value),
};
