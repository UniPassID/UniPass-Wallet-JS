/* eslint-disable no-bitwise */
import { createHash } from "crypto";

const MAX_EMAIL_LEN = 100;
const FR_EMAIL_LEN = Math.floor(MAX_EMAIL_LEN / 31) + 1;
const MIN_EMAIL_LEN = 6;

export function emailHash(inputEmailAddress: string): string {
  if (!inputEmailAddress) {
    throw new Error("Email Address is None");
  }
  let emailAddress = inputEmailAddress.toLowerCase();
  const split = emailAddress.split("@", 2);

  if (
    split[1] === "gmail.com" ||
    split[1] === "googlemail.com" ||
    split[1] === "protonmail.com" ||
    split[1] === "ptoton.me" ||
    split[1] === "pm.me"
  ) {
    emailAddress = Buffer.concat([
      Buffer.from(split[0].replace(".", "")),
      Buffer.from("@"),
      Buffer.from(split[1]),
    ]).toString("utf8");
  }

  return pureEmailHash(emailAddress);
}

/**
 *
 * @param emailAddress The Email Address
 * @returns ZK Hash For Email Address
 */
export function pureEmailHash(emailAddress: string): string {
  if (!emailAddress) {
    throw new Error("Email Address is None");
  }

  let buf = Buffer.from(emailAddress, "utf-8");
  let i;
  const len = buf.length;
  for (i = 0; i < FR_EMAIL_LEN * 31 - len; ++i) {
    buf = Buffer.concat([buf, new Uint8Array([0])]);
  }
  const hash = createHash("sha256").update(buf).digest();
  const hashRev = hash.reverse();
  hashRev[31] &= 0x1f;
  return `0x${Buffer.from(hashRev).toString("hex")}`;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
