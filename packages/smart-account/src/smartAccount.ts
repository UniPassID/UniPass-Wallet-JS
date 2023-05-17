import { Signer, providers } from "ethers";
import { arrayify } from "ethers/lib/utils";
import { KeySecp256k1, Keyset, SignType } from "@unipasswallet/keys";
import { SmartAccountInitOptions, SmartAccountOptions } from "./interface/smartAccount";
import { Wallet } from "@unipasswallet/wallet";
import { MpcSigner } from "./mpcSigner";
import { DEFAULT_MASTER_KEY_ROLE_WEIGHT } from "./utils";

export class SmartAccount {
  private walelt: Wallet;

  private provider: providers.Provider;

  private masterKeySigner: Signer;

  constructor(options: SmartAccountOptions) {
    const { masterKeySigner, nodeUrl: rpcUrl } = options;
    this.provider = new providers.StaticJsonRpcProvider(rpcUrl);
    this.masterKeySigner = masterKeySigner;
  }

  async init(options?: SmartAccountInitOptions): Promise<SmartAccount> {
    const { mpcSignerInitOptions } = options || {};
    if (MpcSigner.isMpcSigner(this.masterKeySigner) && mpcSignerInitOptions) {
      this.masterKeySigner = await this.masterKeySigner.init(mpcSignerInitOptions);
    }
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
    this.walelt = Wallet.create({
      keyset,
      provider: this.provider,
    });
    return this;
  }

  async getAddress(): Promise<string> {
    return this.walelt.getAddress();
  }
}
