/* eslint-disable no-param-reassign */
import { utils } from "ethers";
import * as Dkim from "dkim";

const mailParser = require("mailparser");

export interface Signature {
  signature: Buffer;
  domain: string;
  selector: string;
}

export function verifyDKIMContent(content: Buffer) {
  return new Promise((resolve, reject) => {
    Dkim.verify(content, false, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
}

export class DkimParams {
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
    let sig = utils.solidityPack(
      ["uint32", "bytes"],
      [this.emailHeader.length / 2 - 1, this.emailHeader]
    );
    sig = utils.solidityPack(
      ["bytes", "uint32", "bytes"],
      [sig, this.dkimSig.length / 2 - 1, this.dkimSig]
    );
    sig = utils.solidityPack(
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
    sig = utils.solidityPack(
      ["bytes", "uint32"],
      [sig, this.isSubBase64.length]
    );
    this.isSubBase64.forEach((isBase64) => {
      sig = utils.solidityPack(["bytes", "uint8"], [sig, isBase64 ? 1 : 0]);
    });
    sig = utils.solidityPack(
      ["bytes", "uint32", "bytes"],
      [sig, this.subjectPadding.length, this.subjectPadding]
    );
    sig = utils.solidityPack(["bytes", "uint32"], [sig, this.subject.length]);
    this.subject.forEach((subject) => {
      sig = utils.solidityPack(
        ["bytes", "uint32", "bytes"],
        [sig, subject.length, subject]
      );
    });
    sig = utils.solidityPack(
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

  public static getDkimParams(
    results: Dkim.VerifyResult[],
    subs: Buffer[],
    isSubBase64: boolean[],
    subjectPadding: string,
    fromHeader: string,
    emailBlackList: string[]
  ): DkimParams {
    if (isSubBase64.length === 0) {
      isSubBase64.push(false);
    }
    results.find((result) => {
      const { processedHeader } = result;
      const fromIndex = processedHeader.indexOf("from:");
      const fromEndIndex = processedHeader.indexOf("\r\n", fromIndex);

      let fromLeftIndex = processedHeader.indexOf(`<${fromHeader}>`, fromIndex);
      if (fromLeftIndex === -1 || fromLeftIndex > fromEndIndex) {
        fromLeftIndex = processedHeader.indexOf(fromHeader);
      } else {
        fromLeftIndex += 1;
      }
      const fromRightIndex = fromLeftIndex + fromHeader.length - 1;

      const signature = result.signature as any as Signature;
      if (emailBlackList.includes(signature.domain)) {
        return undefined;
      }

      const subjectIndex = processedHeader.indexOf("subject:");
      const dkimHeaderIndex = processedHeader.indexOf("dkim-signature:");
      const sdidIndex = processedHeader.indexOf(
        signature.domain,
        dkimHeaderIndex
      );
      const sdidRightIndex = sdidIndex + signature.domain.length;
      const selectorIndex = processedHeader.indexOf(
        signature.selector,
        dkimHeaderIndex
      );
      const selectorRightIndex = selectorIndex + signature.selector.length;
      const params = new DkimParams(
        `0x${Buffer.from(processedHeader, "utf-8").toString("hex")}`,
        signature.signature,
        fromIndex,
        fromLeftIndex,
        fromRightIndex,
        subjectIndex,
        processedHeader.indexOf("\r\n", subjectIndex),
        subs,
        Buffer.from(subjectPadding, "utf-8"),
        isSubBase64,
        dkimHeaderIndex,
        sdidIndex,
        sdidRightIndex,
        selectorIndex,
        selectorRightIndex
      );
      return params;
    });
    throw new Error("Email parsed failed");
  }

  public static async parseEmailParams(
    email: string,
    emailBlackList: string[]
  ): Promise<DkimParams> {
    const mail = await mailParser.simpleParser(email, {
      subjectSep: " ",
      isSepBase64: true,
    });

    const subs = {
      subs: [],
      subsAllLen: 0,
      subjectPadding: "",
      subIsBase64: [],
    };
    mail.subParser.forEach((s: string, index: number) => {
      this.dealSubPart(index, s, mail.isSubBase64, subs);
    });

    const from = mail.headers.get("from").value[0].address;
    const results: Dkim.VerifyResult[] = (await verifyDKIMContent(
      Buffer.from(email, "utf-8")
    )) as Dkim.VerifyResult[];
    if (from.split("@")[1] === "unipass.id") {
      Dkim.configKey(null);
    }
    return this.getDkimParams(
      results,
      subs.subs,
      subs.subIsBase64,
      subs.subjectPadding,
      from,
      emailBlackList
    );
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
