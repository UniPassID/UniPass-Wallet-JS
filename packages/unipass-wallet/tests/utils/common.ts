import { ethers } from "ethers";
import {
  getCreate2Address,
  keccak256,
  randomBytes,
  solidityPack,
} from "ethers/lib/utils";
import { DkimParams, pureEmailHash } from "unipass-wallet-dkim";
import MailComposer from "nodemailer/lib/mail-composer";
import DKIM from "nodemailer/lib/dkim";
import { UnipassPrivateKey } from "../../../../config";

export const optimalGasLimit = ethers.constants.Two.pow(21);

export function generateRecoveryEmails(length: number): string[] {
  return [...Array(length)].map(() => {
    const recoveryEmail = `${Buffer.from(randomBytes(16)).toString(
      "hex"
    )}@mail.unipass.me`;
    return recoveryEmail;
  });
}

export function getKeysetHash(
  masterKeyAddress: string,
  threshold: number,
  recoveryEmails: string[]
): string {
  let keysetHash = keccak256(
    ethers.utils.solidityPack(
      ["address", "uint16"],
      [masterKeyAddress, threshold]
    )
  );
  recoveryEmails.forEach((recoveryEmail) => {
    keysetHash = keccak256(
      ethers.utils.solidityPack(
        ["bytes32", "bytes32"],
        [keysetHash, pureEmailHash(recoveryEmail)]
      )
    );
  });
  return keysetHash;
}

export function getProxyAddress(
  moduleMainAddress: string,
  dkimKeysAddress: string,
  factoryAddress: string,
  keysetHash: string
): string {
  const code = ethers.utils.solidityPack(
    ["bytes", "uint256"],
    [
      "0x603a600e3d39601a805130553df3363d3d373d3d3d363d30545af43d82803e903d91601857fd5bf3",
      moduleMainAddress,
    ]
  );
  const codeHash = keccak256(code);
  const salt = keccak256(
    solidityPack(["bytes32", "address"], [keysetHash, dkimKeysAddress])
  );
  const expectedAddress = getCreate2Address(factoryAddress, salt, codeHash);
  return expectedAddress;
}

export async function getSignEmailWithDkim(
  subject: string,
  from: string,
  to: string
) {
  const mail = new MailComposer({
    from,
    to,
    subject,
    html: "<b>Unipass Test</b>",
  });

  const dkim = new DKIM({
    keySelector: "eth",
    domainName: "unipass.id",
    privateKey: UnipassPrivateKey,
  });
  const email = await signEmailWithDkim(mail, dkim);
  return email;
}

export async function signEmailWithDkim(mail: MailComposer, dkim: DKIM) {
  const msg = await mail.compile().build();
  const signedMsg = dkim.sign(msg);
  let buff = "";
  // eslint-disable-next-line no-restricted-syntax
  for await (const chunk of signedMsg) {
    buff += chunk;
  }

  return buff;
}

export async function generateDkimParams(
  emailFrom: string[],
  subject: string,
  indexes: number[]
): Promise<Map<string, DkimParams>> {
  const ret: Map<string, DkimParams> = new Map();

  const emails = await Promise.all(
    indexes.map((i) =>
      getSignEmailWithDkim(subject, emailFrom[i], "test@unipass.id.com")
    )
  );
  const dkims = await Promise.all(
    emails.map((email) => DkimParams.parseEmailParams(email, []))
  );
  indexes.forEach((index, i) => {
    ret.set(emailFrom[index], dkims[i]);
  });
  return ret;
}
