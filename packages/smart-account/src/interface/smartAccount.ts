import { Signer } from "ethers";
import { Environment } from "./utils";
import { Fetch } from "./unipassClient";

export type SmartAccountOptions = {
  rpcUrl: string;
  masterKeySigner: Signer;
  chainId?: number;
  appId: string;
  env?: Environment;
  fetch?: Fetch;
};
