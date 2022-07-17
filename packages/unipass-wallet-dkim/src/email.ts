/* eslint-disable no-bitwise */
import { createHash } from "crypto";

const MAX_EMAIL_LEN = 100;
const FR_EMAIL_LEN = Math.floor(MAX_EMAIL_LEN / 31) + 1;
const MIN_EMAIL_LEN = 6;

export function emailHash(address: string): string {
  const emailAddress = updateEmail(address);
  if (!emailAddress) {
    throw new Error("Invalid Address");
  }

  const split = emailAddress.split("@", 2);
  let buf = Buffer.concat([
    Buffer.from(split[0]),
    Buffer.from("@"),
    Buffer.from(split[1]),
  ]);
  let i;
  const len = split[0].length + 1 + split[1].length;
  for (i = 0; i < FR_EMAIL_LEN * 31 - len; ++i) {
    buf = Buffer.concat([buf, new Uint8Array([0])]);
  }
  const hash = createHash("sha256").update(buf).digest();
  const hashRev = hash.reverse();
  hashRev[31] &= 0x1f;
  return `0x${hashRev.toString("hex")}`;
}

function updateEmail(address: string): string {
  if (!address) {
    return "";
  }
  let emailAddress = address;
  if (
    emailAddress.length < MIN_EMAIL_LEN ||
    emailAddress.length > MAX_EMAIL_LEN
  ) {
    throw new Error("Invalid email length");
  }
  emailAddress = emailAddress.toLocaleLowerCase().trim();
  const emailData = emailAddress.split("@");
  let prefix = emailData[0].split("+")[0];
  if (emailData[1] !== "gmail.com") {
    return `${prefix}@${emailData[1]}`;
  }
  const reg = /[.]+/g;
  prefix = prefix.trim().replace(reg, "");
  return `${prefix}@${emailData[1]}`;
}
