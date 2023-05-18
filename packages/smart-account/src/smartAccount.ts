import { Signer, providers } from "ethers";
import { arrayify } from "ethers/lib/utils";
import { KeySecp256k1, Keyset, SignType } from "@unipasswallet/keys";
import { SmartAccountOptions } from "./interface/smartAccount";
import { Wallet } from "@unipasswallet/wallet";
import { DEFAULT_MASTER_KEY_ROLE_WEIGHT } from "./utils";

export class SmartAccount {
  private wallet: Wallet;

  private provider: providers.Provider;

  private masterKeySigner: Signer;

  private chainId: number;

  private appId: string;

  constructor(options: SmartAccountOptions) {
    const { masterKeySigner, rpcUrl, chainId, appId } = options;
    this.provider = new providers.StaticJsonRpcProvider(rpcUrl);
    this.masterKeySigner = masterKeySigner;
    this.appId = appId;
    if (chainId) {
      this.chainId = chainId;
    }
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
    return this;
  }

  async getAddress(): Promise<string> {
    return this.wallet.getAddress();
  }
}
