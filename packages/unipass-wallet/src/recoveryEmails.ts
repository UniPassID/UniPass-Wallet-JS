import { BytesLike } from "ethers";
import { solidityPack } from "ethers/lib/utils";
import { DkimParamsBase, pureEmailHash } from "unipass-wallet-dkim-base";

export enum GenSigFlag {
  WithoutDkimParams = 0,
  WithDkimParams = 1,
}

export class RecoveryEmails {
  constructor(public threshold: number, public recoveryEmails: string[]) {}

  /**
   *
   * @param signature The prefix bytes of Serialized Bytes
   * @returns The Serialized Bytes
   */
  public serializeWithSignature(prefix: BytesLike): string {
    let sig = solidityPack(["bytes", "uint16"], [prefix, this.threshold]);
    this.recoveryEmails.forEach((recoveryEmail) => {
      sig = solidityPack(
        ["bytes", "bytes32"],
        [sig, pureEmailHash(recoveryEmail)]
      );
    });
    return sig;
  }

  /**
   *
   * @param input The prefix bytes of signature.
   * @param dkimParams The Map of Recovery Email and Dkim Params
   * @returns signature
   */
  public generateSignature(
    input: BytesLike,
    dkimParams: Map<string, DkimParamsBase>
  ): string {
    let sig = solidityPack(["bytes", "uint16"], [input, this.threshold]);

    let count = 0;
    this.recoveryEmails.forEach((recoveryEmail) => {
      const params = dkimParams.get(recoveryEmail);
      if (params === undefined) {
        sig = solidityPack(
          ["bytes", "uint8", "uint8", "bytes"],
          [
            sig,
            GenSigFlag.WithoutDkimParams,
            recoveryEmail.length,
            Buffer.from(recoveryEmail),
          ]
        );
      } else {
        sig = solidityPack(
          ["bytes", "uint8", "uint8", "bytes", "bytes"],
          [
            sig,
            GenSigFlag.WithDkimParams,
            recoveryEmail.length,
            Buffer.from(recoveryEmail),
            params.serialize(),
          ]
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
