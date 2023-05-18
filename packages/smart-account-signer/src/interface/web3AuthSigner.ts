import { Fetch, UnipassRunningEnv } from "./unipassClient";

export type Web3AuthSignerOptions = {
  appId: string;
  runningEnv?: UnipassRunningEnv;
  fetch?: Fetch;
  idToken:string;
};
