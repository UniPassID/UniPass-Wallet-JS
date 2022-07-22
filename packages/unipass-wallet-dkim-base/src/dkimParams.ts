/* eslint-disable no-param-reassign */
import { solidityPack } from "ethers/lib/utils";

export interface Signature {
  signature: Buffer;
  domain: string;
  selector: string;
}

export class DkimParamsBase {
  constructor(
    public emailHeader: string,
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
  ) {}

  public serialize(): string {
    let sig = solidityPack(
      ["uint32", "bytes"],
      [this.emailHeader.length, Buffer.from(this.emailHeader)]
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
}
