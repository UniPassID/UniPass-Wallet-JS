import { Fetch, MpcRunningEnv } from "./mpcClient";
import { IStorage } from "./storage";

export type MpcSignerInitOptions = {
  idToken?: string;
  appId?: string;
  noStorage?: boolean;
  fetch?: Fetch;
  runningEnv?: MpcRunningEnv;
  expireationInterval?: string;
};

export type MpcSignerOptions = {
  storage: IStorage;
};
