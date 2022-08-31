/* eslint-disable no-param-reassign */
import { Contract } from "ethers";
import {
  base64,
  BytesLike,
  hexlify,
  solidityPack,
  toUtf8Bytes,
  toUtf8String,
} from "ethers/lib/utils";

export interface Signature {
  signature: Uint8Array;
  domain: string;
  selector: string;
}

export enum EmailType {
  UpdateKeysetHash,
  LockKeysetHash,
  CancelLockKeysetHash,
  UpdateTimeLockDuring,
  UpdateImplementation,
  SyncAccount,
  CallOtherContract,
}

export class DkimParamsBase {
  public readonly dkimSig: string;

  /**
   *
   * @param emailType What this email used for
   * @param emailHeader The original message For Dkim, UTF8 string or Uint8Array
   * @param _dkimSig The Dkim Signature
   * @param fromIndex The From Header Index Of emailHeader
   * @param fromLeftIndex The Start Index Of From Email Address in the From Header
   * @param fromRightIndex The End Index Of From Email Address in the From Header
   * @param digestHash The digest hash parsed from subject header
   * @param subjectIndex The Start Index Of Subject Header
   * @param subjectRightIndex The End Index Of Suject Header
   * @param dkimHeaderIndex The start Index of Dkim Header
   * @param sdidIndex The Start Index Of Sdid
   * @param sdidRightIndex The End Index Of Sdid
   * @param selectorIndex The Start Index Of Selector
   * @param selectorRightIndex The End Index Of Selector
   */
  constructor(
    public readonly emailType: EmailType,
    public readonly emailHeader: string,
    _dkimSig: BytesLike,
    public readonly fromIndex: number,
    public readonly fromLeftIndex: number,
    public readonly fromRightIndex: number,
    public readonly digestHash: string,
    public readonly subjectIndex: number,
    public readonly subjectRightIndex: number,
    public readonly dkimHeaderIndex: number,
    public readonly sdidIndex: number,
    public readonly sdidRightIndex: number,
    public readonly selectorIndex: number,
    public readonly selectorRightIndex: number
  ) {
    this.dkimSig = hexlify(_dkimSig);
  }

  /**
   * @desc Serialize For Signature Generator
   * @returns Serialized Bytes
   */
  public serialize(): string {
    let sig = solidityPack(
      [
        "uint32",
        "uint32",
        "uint32",
        "uint32",
        "uint32",
        "uint32",
        "uint32",
        "uint32",
        "uint32",
        "uint32",
        "uint32",
      ],
      [
        this.emailType,
        this.subjectIndex,
        this.subjectRightIndex,
        this.fromIndex,
        this.fromLeftIndex,
        this.fromRightIndex,
        this.dkimHeaderIndex,
        this.selectorIndex,
        this.selectorRightIndex,
        this.sdidIndex,
        this.sdidRightIndex,
      ]
    );
    sig = solidityPack(
      ["bytes", "uint32", "bytes"],
      [sig, this.emailHeader.length, toUtf8Bytes(this.emailHeader)]
    );
    sig = solidityPack(
      ["bytes", "uint32", "bytes"],
      [sig, this.dkimSig.length / 2 - 1, this.dkimSig]
    );

    return sig;
  }

  public toJsonObj() {
    return {
      emailType: this.emailType,
      digestHash: this.digestHash,
      subjectIndex: this.subjectIndex,
      subjectRightIndex: this.subjectRightIndex,
      fromIndex: this.fromIndex,
      fromLeftIndex: this.fromLeftIndex,
      fromRightIndex: this.fromRightIndex,
      dkimHeaderIndex: this.dkimHeaderIndex,
      selectorIndex: this.selectorIndex,
      selectorRightIndex: this.selectorRightIndex,
      sdidIndex: this.sdidIndex,
      sdidRightIndex: this.sdidRightIndex,
      emailHeader: this.emailHeader,
      dkimSig: hexlify(this.dkimSig),
    };
  }

  public toString(): string {
    return JSON.stringify(this.toJsonObj());
  }

  public static fromJsonObj(obj: any): DkimParamsBase {
    return new DkimParamsBase(
      obj.emailType,
      obj.emailHeader,
      obj.dkimSig,
      obj.fromIndex,
      obj.fromLeftIndex,
      obj.fromRightIndex,
      obj.digestHash,
      obj.subjectIndex,
      obj.subjectRightIndex,
      obj.dkimHeaderIndex,
      obj.sdidIndex,
      obj.sdidRightIndex,
      obj.selectorIndex,
      obj.selectorRightIndex
    );
  }

  public static fromString(input: string): DkimParamsBase {
    const obj = JSON.parse(input);

    return DkimParamsBase.fromJsonObj(obj);
  }

  static dealSubPart(
    subPartIndex: number,
    subPart: string,
    subIsBase64: boolean[],
    ret: {
      subs: string[];
      subsAllLen: number;
      subjectPadding: string;
      subIsBase64: boolean[];
    }
  ) {
    if (ret.subsAllLen >= 66) {
      return;
    }

    if (ret.subsAllLen === 0) {
      if (subIsBase64[subPartIndex]) {
        const decodedPart = toUtf8String(base64.decode(subPart));
        const IndexOf0x = decodedPart.indexOf("0x");

        if (IndexOf0x > -1) {
          const remainder = (decodedPart.length - IndexOf0x) % 3;
          ret.subsAllLen = decodedPart.length - IndexOf0x;

          if (ret.subsAllLen > 66) {
            ret.subsAllLen = 66;
          }

          if (remainder === 1) {
            ret.subjectPadding = "0";
          } else if (remainder === 2) {
            ret.subjectPadding = "0x";
          }
          ret.subs.push(
            subPart.slice(
              subPart.length -
                ((decodedPart.length - IndexOf0x - remainder) / 3) * 4,
              subPart.length -
                ((decodedPart.length - IndexOf0x - ret.subsAllLen) / 3) * 4
            )
          );
          ret.subIsBase64.push(true);
        }
      } else {
        const IndexOf0x = subPart.indexOf("0x");

        if (IndexOf0x > -1) {
          ret.subsAllLen = subPart.length - IndexOf0x;

          if (ret.subsAllLen > 66) {
            ret.subsAllLen = 66;
          }
          ret.subs.push(subPart.slice(IndexOf0x, IndexOf0x + ret.subsAllLen));
          ret.subIsBase64.push(false);
        }
      }
    } else if (subIsBase64[subPartIndex]) {
      const len = Math.min(66 - ret.subsAllLen, (subPart.length / 4) * 3);
      ret.subs.push(subPart.slice(0, Math.ceil(len / 3) * 4));
      ret.subsAllLen += len;
      ret.subIsBase64.push(true);
    } else {
      const len = Math.min(66 - ret.subsAllLen, subPart.length);
      ret.subs.push(subPart.slice(0, len));
      ret.subsAllLen += len;
      ret.subIsBase64.push(false);
    }
  }

  public async dkimVerify(contract: Contract, oriEmailFrom: string) {
    return contract.dkimVerifyParams(this, toUtf8Bytes(oriEmailFrom));
  }
}
