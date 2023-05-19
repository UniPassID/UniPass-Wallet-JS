import { Environment } from "@unipasswallet/smart-account";
import { Fetch } from "@unipasswallet/smart-account";
import { IStorage } from "./storage";

export type UniPassJwtSignerOptions = {
  appId: string;
  env?: Environment;
  fetch?: Fetch;
  idToken?: string;
  storage?: IStorage;
};

export type UniPassJwtSignerStorageInfo = {
  privateKey: string;
};
