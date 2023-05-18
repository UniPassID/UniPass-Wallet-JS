import { Environment } from "./unipassClient";

export interface IStorage {
  getItem(key: string): Promise<string | undefined>;
  removeItem(key: string): Promise<void>;
  setItem(key: string, value: string): Promise<void>;
}

export type MpcSignerInfo = {
  userKey: string;
  authorization: string;
  runningEnv: Environment;
  address: string;
};
