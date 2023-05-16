import { Keyset } from "@unipasswallet/keys";
import { Signer, providers } from "ethers";
import { UnipassToBusinessStorage } from "../toBusinessStorage";
import { UnipassToBusinessClient } from "../toBusinessClient";
import { Fetch, UnipassSource } from "./unipassClient";

export type UnipassToBusinessAccountOptions = {
  walletAddress: string;
  keyset: Keyset;
  storage: UnipassToBusinessStorage;
  accountType: UnipassToBusinessOpenIDAccount | UnipassToBusinessEOAAccount;
  masterKeyIndex?: number;
  provider: providers.JsonRpcProvider;
};

export type Web3AuthOptions = {
  clientId: string;
  verifier: string;
  verifierId: string;
};

export type UnipassToBusinessConnectParams = {
  connectParams: UnipassToBusinessConnectByOAuth | UnipassToBusinessConnectByEOAWallet;
  storage: UnipassToBusinessStorage;
  appId: string;
  rpcUrl: string;
};

export type UnipassToBusinessConnectByOAuth = {
  idToken: string;
  accessToken: string;
  unipassServerUrl: string;
  source: UnipassSource;
  fetch?: Fetch;
};

export type UnipassToBusinessConnectByEOAWallet = {
  signer: Signer;
};

export type UnipassToBusinessOpenIDAccount = {
  unipassClient: UnipassToBusinessClient;
  authorization: string;
  userKey: string;
  unipassRelayerUrl: string;
};

export type UnipassToBusinessEOAAccount = {
  signer: Signer;
};
