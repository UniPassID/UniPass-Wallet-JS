import { BytesLike } from "ethers";
import { DkimParamsBase } from "unipass-wallet-dkim-base";
import { RecoveryEmails } from "../recoveryEmails";

export class RecoveryEmailsSigGenerator {
  constructor(
    public masterKeyAddr: BytesLike,
    public recoveryEmails: RecoveryEmails
  ) {}

  public generateSignature(dkimParams: Map<string, DkimParamsBase>): string {
    return this.recoveryEmails.generateSignature(
      this.masterKeyAddr,
      dkimParams
    );
  }
}
