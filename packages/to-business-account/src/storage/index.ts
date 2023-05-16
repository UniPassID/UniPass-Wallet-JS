export * from "./localUnipassStorage";

export interface UnipassStorage {
  getItem(key: string): Promise<string | undefined>;
  removeItem(key: string): Promise<void>;
  setItem(key: string, value: string): Promise<void>;
}
