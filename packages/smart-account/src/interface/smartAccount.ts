import { Signer } from "ethers";

export type SmartAccountOptions = {
  rpcUrl: string;
  masterKeySigner: Signer;
  chainId?: number;
  appId: string;
};
