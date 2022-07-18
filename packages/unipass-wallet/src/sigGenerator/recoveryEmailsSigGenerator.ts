import { BytesLike } from "ethers";
import { DkimParams } from "unipass-wallet-dkim";
import { RecoveryEmails } from "../recoveryEmails";

export class RecoveryEmailsSigGenerator {
  constructor(
    public masterKeyAddr: BytesLike,
    public recoveryEmails: RecoveryEmails
  ) {}

  public generateSignature(dkimParams: Map<string, DkimParams>): string {
    return this.recoveryEmails.generateSignature(
      this.masterKeyAddr,
      dkimParams
    );
  }
}
