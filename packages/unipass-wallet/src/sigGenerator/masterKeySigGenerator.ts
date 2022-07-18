import { Wallet } from "ethers";
import { Bytes } from "ethers/lib/utils";
import { DkimParams } from "unipass-wallet-dkim";
import { RecoveryEmails } from "../recoveryEmails";
import { BaseSigner, SignType } from "./baseSigner";

export class MasterKeySigGenerator extends BaseSigner {
  constructor(public masterKey: Wallet, public recoveryEmails: RecoveryEmails) {
    super();
  }

  public ethSign(message: string | Bytes): Promise<string> {
    return this.masterKey.signMessage(message);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars, class-methods-use-this
  public eip712Sign(hash: string | Bytes): Promise<string> {
    throw new Error("Unimplement");
  }

  public async generateSignature(
    message: string | Bytes,
    signType: SignType
  ): Promise<string> {
    const sig = await this.sign(message, signType);
    return this.recoveryEmails.serializeWithSignature(sig);
  }

  public async generateSignatureWithDkimParams(
    message: string | Bytes,
    signType: SignType,
    dkimParams: Map<string, DkimParams>
  ): Promise<string> {
    const sig = await this.sign(message, signType);
    return this.recoveryEmails.generateSignature(sig, dkimParams);
  }
}
