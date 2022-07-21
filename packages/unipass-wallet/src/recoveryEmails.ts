import { BytesLike } from "ethers";
import { solidityPack } from "ethers/lib/utils";
import { DkimParams, emailHash } from "unipass-wallet-dkim";

export enum GenSigFlag {
  WithoutDkimParams = 0,
  WithDkimParams = 1,
}

export class RecoveryEmails {
  constructor(public threshold: number, public recoveryEmails: string[]) {}

  public serializeWithSignature(signature: BytesLike): string {
    let sig = solidityPack(["bytes", "uint16"], [signature, this.threshold]);
    this.recoveryEmails.forEach((recoveryEmail) => {
      sig = solidityPack(["bytes", "bytes32"], [sig, emailHash(recoveryEmail)]);
    });
    return sig;
  }

  public generateSignature(
    input: BytesLike,
    dkimParams: Map<string, DkimParams>
  ): string {
    let sig = solidityPack(["bytes", "uint16"], [input, this.threshold]);

    let count = 0;
    this.recoveryEmails.forEach((recoveryEmail) => {
      const params = dkimParams.get(recoveryEmail);
      if (params === undefined) {
        sig = solidityPack(
          ["bytes", "uint8", "bytes32"],
          [sig, GenSigFlag.WithoutDkimParams, emailHash(recoveryEmail)]
        );
      } else {
        sig = solidityPack(
          ["bytes", "uint8", "bytes32", "bytes"],
          [sig, GenSigFlag.WithDkimParams, recoveryEmail, params.serialize()]
        );
        count++;
      }
    });
    if (count < this.threshold) {
      throw new Error(
        `expected dkim count[${count}] greater or euqal threshold[${this.threshold}]`
      );
    }
    return sig;
  }
}
