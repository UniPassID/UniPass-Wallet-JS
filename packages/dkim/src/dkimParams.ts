import { DkimParamsBase, Signature, EmailType } from "@unipasswallet/dkim-base";
import { BytesLike } from "ethers";
import { hexlify } from "ethers/lib/utils";
import * as Dkim from "dkim";

const mailParser = require("mailparser");

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

export class DkimParams extends DkimParamsBase {
  /**
   *
   * @param emailType What this email used for
   * @param emailHeader The original message For Dkim, UTF8 string or Uint8Array
   * @param dkimSig The Dkim Signature
   * @param fromIndex The From Header Index Of emailHeader
   * @param fromLeftIndex The Start Index Of From Email Address in the From Header
   * @param fromRightIndex The End Index Of From Email Address in the From Header
   * @param digestHash The digest hash parsed from Subject
   * @param subjectIndex The Start Index Of Subject Header
   * @param subjectRightIndex The End Index Of Suject Header
   * @param dkimHeaderIndex The start Index of Dkim Header
   * @param sdidIndex The Start Index Of Sdid
   * @param sdidRightIndex The End Index Of Sdid
   * @param selectorIndex The Start Index Of Selector
   * @param selectorRightIndex The End Index Of Selector
   */
  constructor(
    emailType: EmailType,
    emailHeader: string,
    dkimSig: BytesLike,
    fromIndex: number,
    fromLeftIndex: number,
    fromRightIndex: number,
    digestHash: string,
    subjectIndex: number,
    subjectRightIndex: number,
    dkimHeaderIndex: number,
    sdidIndex: number,
    sdidRightIndex: number,
    selectorIndex: number,
    selectorRightIndex: number,
  ) {
    super(
      emailType,
      emailHeader,
      dkimSig,
      fromIndex,
      fromLeftIndex,
      fromRightIndex,
      digestHash,
      subjectIndex,
      subjectRightIndex,
      dkimHeaderIndex,
      sdidIndex,
      sdidRightIndex,
      selectorIndex,
      selectorRightIndex,
    );
  }

  public static getDkimParams(
    results: Dkim.VerifyResult[],
    emailType: EmailType,
    fromHeader: string,
    digestHash: string,
    emailBlackList: string[],
  ): DkimParams {
    const params = results
      .map((result): DkimParams | undefined => {
        const { processedHeader } = result;
        const signature = result.signature as Signature;

        if (emailBlackList.includes(signature.domain)) {
          return undefined;
        }

        return DkimParamsBase.create(
          emailType,
          fromHeader,
          digestHash,
          processedHeader,
          hexlify(signature.signature),
          signature.domain,
          signature.selector,
        ) as DkimParams;
      })
      .find((v) => v !== undefined);

    return params;
  }

  public static async parseEmailParams(email: string, emailBlackList: string[]): Promise<DkimParams> {
    const mail = await mailParser.simpleParser(email, {
      subjectSep: " ",
      isSepBase64: true,
    });

    const subject = mail.headers.get("subject");
    const from: string = mail.headers.get("from").value[0].address;
    const [emailType, digestHash] = DkimParams.parseEmailSubject(subject);

    const results: Dkim.VerifyResult[] = (await verifyDKIMContent(Buffer.from(email, "utf-8"))) as Dkim.VerifyResult[];

    return this.getDkimParams(results, emailType, from, digestHash, emailBlackList);
  }

  public static parseEmailSubject(emailSubject: string): [EmailType, string] {
    if (emailSubject.startsWith("UniPass-Update-Account-0x") && emailSubject.length === 89) {
      return [EmailType.UpdateKeysetHash, emailSubject.slice(23)];
    }

    if (emailSubject.startsWith("UniPass-Start-Recovery-0x") && emailSubject.length === 89) {
      return [EmailType.LockKeysetHash, emailSubject.slice(23)];
    }

    if (emailSubject.startsWith("UniPass-Cancel-Recovery-0x") && emailSubject.length === 90) {
      return [EmailType.CancelLockKeysetHash, emailSubject.slice(24)];
    }

    if (emailSubject.startsWith("UniPass-Update-Timelock-0x") && emailSubject.length === 90) {
      return [EmailType.UpdateTimeLockDuring, emailSubject.slice(24)];
    }

    if (emailSubject.startsWith("UniPass-Update-Implementation-0x") && emailSubject.length === 96) {
      return [EmailType.UpdateImplementation, emailSubject.slice(30)];
    }

    if (emailSubject.startsWith("UniPass-Sync-Account-0x") && emailSubject.length === 87) {
      return [EmailType.SyncAccount, emailSubject.slice(21)];
    }

    if (emailSubject.startsWith("UniPass-Call-Contract-0x") && emailSubject.length === 88) {
      return [EmailType.CallOtherContract, emailSubject.slice(22)];
    }
    throw new Error(`Invalid Email Subject: ${emailSubject}`);
  }
}
