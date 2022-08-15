/* eslint-disable no-param-reassign */
import { Contract } from "ethers";
import { solidityPack } from "ethers/lib/utils";

export interface Signature {
  signature: Buffer;
  domain: string;
  selector: string;
}

export interface IDkimParamsBaseSerMiddler {
  emailHeader: string;
  dkimSig: string;
  fromIndex: number;
  fromLeftIndex: number;
  fromRightIndex: number;
  subjectIndex: number;
  subjectRightIndex: number;
  subject: string[];
  subjectPadding: string;
  isSubBase64: boolean[];
  dkimHeaderIndex: number;
  sdidIndex: number;
  sdidRightIndex: number;
  selectorIndex: number;
  selectorRightIndex: number;
}

export class DkimParamsBase {
  public emailHeader: Uint8Array;

  /**
   *
   * @param _emailHeader The original message For Dkim, UTF8 string or Uint8Array
   * @param dkimSig The Dkim Signature
   * @param fromIndex The From Header Index Of emailHeader
   * @param fromLeftIndex The Start Index Of From Email Address in the From Header
   * @param fromRightIndex The End Index Of From Email Address in the From Header
   * @param subjectIndex The Start Index Of Subject Header
   * @param subjectRightIndex The End Index Of Suject Header
   * @param subject The subject parts
   * @param subjectPadding The subject prefix padding
   * @param isSubBase64 Is base64 encoded for subject parts
   * @param dkimHeaderIndex The start Index of Dkim Header
   * @param sdidIndex The Start Index Of Sdid
   * @param sdidRightIndex The End Index Of Sdid
   * @param selectorIndex The Start Index Of Selector
   * @param selectorRightIndex The End Index Of Selector
   */
  constructor(
    _emailHeader: string | Uint8Array,
    public dkimSig: Uint8Array,
    public fromIndex: number,
    public fromLeftIndex: number,
    public fromRightIndex: number,
    public subjectIndex: number,
    public subjectRightIndex: number,
    public subject: Uint8Array[],
    public subjectPadding: Uint8Array,
    public isSubBase64: boolean[],
    public dkimHeaderIndex: number,
    public sdidIndex: number,
    public sdidRightIndex: number,
    public selectorIndex: number,
    public selectorRightIndex: number
  ) {
    if (typeof _emailHeader === "string") {
      this.emailHeader = Buffer.from(_emailHeader, "utf-8");
    } else {
      this.emailHeader = _emailHeader;
    }
  }

  /**
   * @desc Serialize For Signature Generator
   * @returns Serialized Bytes
   */
  public serialize(): string {
    let sig = solidityPack(
      ["uint32", "bytes"],
      [this.emailHeader.length, this.emailHeader]
    );
    sig = solidityPack(
      ["bytes", "uint32", "bytes"],
      [sig, this.dkimSig.length, this.dkimSig]
    );
    sig = solidityPack(
      ["bytes", "uint32", "uint32", "uint32", "uint32", "uint32"],
      [
        sig,
        this.fromIndex,
        this.fromLeftIndex,
        this.fromRightIndex,
        this.subjectIndex,
        this.subjectRightIndex,
      ]
    );
    sig = solidityPack(["bytes", "uint32"], [sig, this.isSubBase64.length]);
    this.isSubBase64.forEach((isBase64) => {
      sig = solidityPack(["bytes", "uint8"], [sig, isBase64 ? 1 : 0]);
    });
    sig = solidityPack(
      ["bytes", "uint32", "bytes"],
      [sig, this.subjectPadding.length, this.subjectPadding]
    );
    sig = solidityPack(["bytes", "uint32"], [sig, this.subject.length]);
    this.subject.forEach((subject) => {
      sig = solidityPack(
        ["bytes", "uint32", "bytes"],
        [sig, subject.length, subject]
      );
    });
    sig = solidityPack(
      ["bytes", "uint32", "uint32", "uint32", "uint32", "uint32"],
      [
        sig,
        this.dkimHeaderIndex,
        this.selectorIndex,
        this.selectorRightIndex,
        this.sdidIndex,
        this.sdidRightIndex,
      ]
    );
    return sig;
  }

  public toDkimParamsBaseSerMiddler(): IDkimParamsBaseSerMiddler {
    return {
      emailHeader: Buffer.from(this.emailHeader).toString("base64"),
      dkimSig: Buffer.from(this.dkimSig).toString("base64"),
      fromIndex: this.fromIndex,
      fromLeftIndex: this.fromLeftIndex,
      fromRightIndex: this.fromRightIndex,
      subjectIndex: this.subjectIndex,
      subjectRightIndex: this.subjectRightIndex,
      subject: this.subject.map((v) => Buffer.from(v).toString("base64")),
      subjectPadding: Buffer.from(this.subjectPadding).toString("base64"),
      isSubBase64: this.isSubBase64,
      dkimHeaderIndex: this.dkimHeaderIndex,
      sdidIndex: this.sdidIndex,
      sdidRightIndex: this.sdidRightIndex,
      selectorIndex: this.selectorIndex,
      selectorRightIndex: this.selectorRightIndex,
    };
  }

  public toString(): string {
    return JSON.stringify(this.toDkimParamsBaseSerMiddler());
  }

  public static fromDkimParamsBaseSerMiddler(
    input: IDkimParamsBaseSerMiddler
  ): DkimParamsBase {
    return new DkimParamsBase(
      Buffer.from(input.emailHeader, "base64"),
      Buffer.from(input.dkimSig, "base64"),
      input.fromIndex,
      input.fromLeftIndex,
      input.fromRightIndex,
      input.subjectIndex,
      input.subjectRightIndex,
      input.subject.map((v) => Buffer.from(v, "base64")),
      Buffer.from(input.subjectPadding, "base64"),
      input.isSubBase64,
      input.dkimHeaderIndex,
      input.sdidIndex,
      input.sdidRightIndex,
      input.selectorIndex,
      input.selectorRightIndex
    );
  }

  public static fromString(input: string): DkimParamsBase {
    const iDkimParamsBaseSerMiddler: IDkimParamsBaseSerMiddler =
      JSON.parse(input);
    return this.fromDkimParamsBaseSerMiddler(iDkimParamsBaseSerMiddler);
  }

  static dealSubPart(
    subPartIndex: number,
    subPart: string,
    subIsBase64: boolean[],
    ret: {
      subs: Buffer[];
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
        const decodedPart = Buffer.from(subPart, "base64").toString("utf8");
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
            Buffer.from(
              subPart.slice(
                subPart.length -
                  ((decodedPart.length - IndexOf0x - remainder) / 3) * 4,
                subPart.length -
                  ((decodedPart.length - IndexOf0x - ret.subsAllLen) / 3) * 4
              ),
              "utf8"
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
          ret.subs.push(
            Buffer.from(
              subPart.slice(IndexOf0x, IndexOf0x + ret.subsAllLen),
              "utf8"
            )
          );
          ret.subIsBase64.push(false);
        }
      }
    } else if (subIsBase64[subPartIndex]) {
      const len = Math.min(66 - ret.subsAllLen, (subPart.length / 4) * 3);
      ret.subs.push(
        Buffer.from(subPart.slice(0, Math.ceil(len / 3) * 4), "utf8")
      );
      ret.subsAllLen += len;
      ret.subIsBase64.push(true);
    } else {
      const len = Math.min(66 - ret.subsAllLen, subPart.length);
      ret.subs.push(Buffer.from(subPart.slice(0, len), "utf8"));
      ret.subsAllLen += len;
      ret.subIsBase64.push(false);
    }
  }

  public async dkimVerify(contract: Contract, oriEmailFrom: string) {
    return contract.dkimVerifyParams(this, Buffer.from(oriEmailFrom));
  }
}
