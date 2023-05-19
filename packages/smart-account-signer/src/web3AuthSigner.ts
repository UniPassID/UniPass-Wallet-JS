import { Bytes, Signer, Wallet } from "ethers";
import {
  Environment,
  SmartAccountError,
  SmartAccountErrorCode,
  getUnipassServerInfo,
  UnipassClient,
} from "@unipasswallet/smart-account";
import { Web3AuthSignerOptions } from "./interface/web3AuthSigner";
import { getWeb3AuthPrivateKey } from "./utils";
import * as CrossFetch from "cross-fetch";
import { Provider, TransactionRequest } from "@ethersproject/abstract-provider";
import { defineReadOnly } from "@ethersproject/properties";

export class Web3AuthSigner extends Signer {
  private appId: string;

  private unipassClient: UnipassClient;

  private chainId: number;

  private rpcUrl: string;

  private idToken: string;

  private env: "testnet" | "mainnet";

  private wallet: Wallet;

  constructor(options: Web3AuthSignerOptions) {
    super();

    const { appId, env: runningEnv = Environment.Production, fetch = CrossFetch.fetch, idToken } = options;

    const { unipassServerUrl, chainId, rpcUrl, env } = getUnipassServerInfo(runningEnv);

    this.appId = appId;
    this.unipassClient = new UnipassClient(unipassServerUrl, fetch);
    this.chainId = chainId;
    this.rpcUrl = rpcUrl;
    this.env = env;
    this.idToken = idToken;
  }

  async init(): Promise<Web3AuthSigner> {
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

    return this;
  }

  connect(provider: Provider): Web3AuthSigner {
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
