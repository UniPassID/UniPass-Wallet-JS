import { Environment } from "@unipasswallet/smart-account";
import { Fetch } from "@unipasswallet/smart-account/src/interface/unipassClient";
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
