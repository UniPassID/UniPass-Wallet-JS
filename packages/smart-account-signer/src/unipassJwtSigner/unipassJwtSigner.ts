import { Bytes, Signer, Wallet } from "ethers";
import {
  Environment,
  SmartAccountError,
  SmartAccountErrorCode,
  getUnipassServerInfo,
  UnipassClient,
} from "@unipasswallet/smart-account";
import { UniPassJwtSignerOptions } from "../interface/unipassJwtSigner";
import { getWeb3AuthPrivateKey } from "../utils";
import * as CrossFetch from "cross-fetch";
import { Provider, TransactionRequest } from "@ethersproject/abstract-provider";
import { defineReadOnly } from "@ethersproject/properties";
import { UniPassJwtSignerStorage } from "./jwtSignerStorage";

export class UniPassJwtSigner extends Signer {
  private appId: string;

  private unipassClient: UnipassClient;

  private chainId: number;

  private rpcUrl: string;

  private env: "testnet" | "mainnet";

  private wallet: Wallet;

  private storage?: UniPassJwtSignerStorage;

  private idToken?: string;

  constructor(options: UniPassJwtSignerOptions) {
    super();

    const { appId, env: runningEnv = Environment.Production, fetch = CrossFetch.fetch, storage, idToken } = options;

    const { unipassServerUrl, chainId, rpcUrl, env } = getUnipassServerInfo(runningEnv);

    this.appId = appId;
    this.unipassClient = new UnipassClient(unipassServerUrl, fetch);
    this.chainId = chainId;
    this.rpcUrl = rpcUrl;
    this.env = env;
    this.idToken = idToken;
    if (storage) {
      this.storage = new UniPassJwtSignerStorage(storage);
    }
  }

  async init(): Promise<UniPassJwtSigner> {
    if (this.storage) {
      const signerInfo = await this.storage.getUniPassJwtSignerInfo();
      if (signerInfo) {
        const { privateKey } = signerInfo;
        this.wallet = new Wallet(privateKey);
        return this;
      }
    }

    if (this.idToken) {
      const {
        web3authConfig: { clientId, verifierName },
        jwtVerifierIdKey,
      } = await this.unipassClient.config(this.appId, this.chainId);

      const web3AuthPrivateKey = await getWeb3AuthPrivateKey(
        clientId,
        this.idToken,
        verifierName,
        jwtVerifierIdKey,
        this.chainId,
        this.env,
        this.rpcUrl,
      );

      if (!web3AuthPrivateKey) {
        const error = {
          code: SmartAccountErrorCode.Web3AuthLoginFailed,
          message: "Web3Auth Login Failed",
          data: undefined,
        } as SmartAccountError<undefined>;
        throw error;
      }
      this.wallet = new Wallet(web3AuthPrivateKey);

      if (this.storage) {
        await this.storage.updateUniPassJwtSignerInfo({ privateKey: web3AuthPrivateKey });
      }

      return this;
    }

    const error = {
      code: SmartAccountErrorCode.BadParams,
      data: undefined,
      message: "Expected Id Token Or Valid Storage",
    } as SmartAccountError<undefined>;
    throw error;
  }

  connect(provider: Provider): UniPassJwtSigner {
    defineReadOnly(this, "provider", provider);
    return this;
  }

  async signMessage(message: Bytes | string): Promise<string> {
    return this.wallet.signMessage(message);
  }

  async getAddress(): Promise<string> {
    return this.wallet.getAddress();
  }

  async signTransaction(transaction: TransactionRequest): Promise<string> {
    return this.wallet.signTransaction(transaction);
  }
}
