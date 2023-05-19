import { Signer, providers } from "ethers";
import { arrayify } from "ethers/lib/utils";
import { KeySecp256k1, Keyset, SignType } from "@unipasswallet/keys";
import { SmartAccountOptions } from "./interface/smartAccount";
import { Wallet } from "@unipasswallet/wallet";
import * as CrossFetch from "cross-fetch";
import { DEFAULT_MASTER_KEY_ROLE_WEIGHT, getUnipassServerInfo } from "./utils";
import { Environment, UnipassKeyType } from "./interface";
import { UnipassClient } from "./unipassClient";

export class SmartAccount {
  private wallet: Wallet;

  private provider: providers.Provider;

  private masterKeySigner: Signer;

  private chainId: number;

  private appId: string;

  private unipassClient: UnipassClient;

  constructor(options: SmartAccountOptions) {
    const { masterKeySigner, rpcUrl, chainId, appId, env = Environment.Production, fetch = CrossFetch.fetch } = options;
    this.provider = new providers.StaticJsonRpcProvider(rpcUrl);
    this.masterKeySigner = masterKeySigner;
    this.appId = appId;
    if (chainId) {
      this.chainId = chainId;
    }
    const { unipassServerUrl } = getUnipassServerInfo(env);
    this.unipassClient = new UnipassClient(unipassServerUrl, fetch);
  }

  async init(): Promise<SmartAccount> {
    const masterKeyAddress = await this.masterKeySigner.getAddress();
    const masterKey = new KeySecp256k1(
      masterKeyAddress,
      DEFAULT_MASTER_KEY_ROLE_WEIGHT,
      SignType.EthSign,
      async (digest) => {
        return this.masterKeySigner.signMessage(arrayify(digest));
      },
    );
    const keyset = new Keyset([masterKey]);
    this.wallet = Wallet.create({
      keyset,
      provider: this.provider,
    });
    if (!this.chainId) {
      this.chainId = (await this.provider.getNetwork()).chainId;
    }
    try {
      await this.unipassClient.register({
        keysetJson: keyset.toJson(),
        masterKey: {
          masterKeyAddress: masterKey.address,
          keyType: UnipassKeyType.ToBusinessEOA,
        },
        appId: this.appId,
      });
      return this;
    } catch {
      return this;
    }
  }

  async getAddress(): Promise<string> {
    return this.wallet.getAddress();
  }

  async isDeployed(): Promise<boolean> {
    const address = await this.getAddress();
    return (await this.provider.getCode(address)) !== "0x";
  }

  getProvider(): providers.Provider {
    return this.provider;
  }

  getChainId(): number {
    return this.chainId;
  }
}
