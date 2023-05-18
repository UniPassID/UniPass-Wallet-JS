import { Fetch, Environment } from "./unipassClient";

export type Web3AuthSignerOptions = {
  appId: string;
  env?: Environment;
  fetch?: Fetch;
  idToken:string;
};
