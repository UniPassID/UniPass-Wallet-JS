import { Wallet } from "ethers";
import { arrayify, Bytes, BytesLike } from "ethers/lib/utils";
import { DkimParams } from "unipass-wallet-dkim";
import { RecoveryEmails } from "../recoveryEmails";
import { BaseSigner, SignType } from "./baseSigner";

export class MasterKeySigGenerator extends BaseSigner {
  constructor(public masterKey: Wallet, public recoveryEmails: RecoveryEmails) {
    super();
  }

  public ethSign(message: BytesLike): Promise<string> {
    return this.masterKey.signMessage(arrayify(message));
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars, class-methods-use-this
  public eip712Sign(hash: BytesLike): Promise<string> {
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
