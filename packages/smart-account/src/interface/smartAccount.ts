import { MpcSignerInitOptions } from "./mpcSigner";
import { Signer } from "ethers";

export type Web3AuthOptions = {
  clientId: string;
  verifier: string;
  verifierId: string;
};

export type SmartAccountInitOptions = {
  mpcSignerInitOptions?: MpcSignerInitOptions;
};

export type SmartAccountOptions = {
  nodeUrl: string;
  masterKeySigner: Signer;
};
