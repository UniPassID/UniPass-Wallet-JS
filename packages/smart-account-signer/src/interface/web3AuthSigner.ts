import { Environment } from "@unipasswallet/smart-account";
import { Fetch } from "@unipasswallet/smart-account";

export type Web3AuthSignerOptions = {
  appId: string;
  env?: Environment;
  fetch?: Fetch;
  idToken: string;
};
