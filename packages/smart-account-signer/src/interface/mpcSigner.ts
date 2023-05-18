import { Fetch, Environment } from "./unipassClient";
import { IStorage } from "./storage";

export type MpcSignerInitOptions = {
  idToken?: string;
  appId?: string;
  noStorage?: boolean;
  fetch?: Fetch;
  env?: Environment;
  expirationInterval?: string;
};

export type MpcSignerOptions = {
  storage: IStorage;
};
