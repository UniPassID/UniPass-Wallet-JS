import { Environment } from "@unipasswallet/smart-account";
import { Fetch } from "@unipasswallet/smart-account/src/interface/unipassClient";
import { IStorage } from "./storage";

export type MpcSignerOptions = {
  storage: IStorage;
  idToken?: string;
  appId: string;
  fetch?: Fetch;
  env?: Environment;
  expirationInterval?: string;
};
