import { Fetch, UnipassRunningEnv } from "./unipassClient";
import { IStorage } from "./storage";

export type MpcSignerInitOptions = {
  idToken?: string;
  appId?: string;
  noStorage?: boolean;
  fetch?: Fetch;
  runningEnv?: UnipassRunningEnv;
  expirationInterval?: string;
};

export type MpcSignerOptions = {
  storage: IStorage;
};
