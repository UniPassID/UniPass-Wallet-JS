export * from "./wallet";

export * from "./permit";

export * from "./sessionKey";

export * from "./mainExecuteTransaction";

export * from "./bundledExecuteCall";

export * from "./rawMainExecuteCall";

export * from "./mainExecuteCall";

export * from "./rawMainExecuteTransaction";

export * from "./rawBundledExecuteCall";

import { subDigest } from "@unipasswallet/utils";
import { EmailType } from "@unipasswallet/dkim-base";
import { RoleWeight, KeyType } from "@unipasswallet/keys";
import {
  arrayify,
  defaultAbiCoder,
  hashMessage,
  hexlify,
  keccak256,
  recoverAddress,
  solidityKeccak256,
} from "ethers/lib/utils";

export async function isValidSignature(
  hash: string,
  signature: string,
  walletAddress: string,
  keysetHash: string,
): Promise<boolean> {
  const sig = arrayify(signature);
  let index = 0;
  const isSessionKeySigned = sig[index] === 1;
  index++;
  if (isSessionKeySigned) {
    const timestamp = bytesToUint32(sig.slice(index, index + 4));
    index += 4;
    if (Date.now() / 1000 < timestamp) {
      throw new Error(`Signature Expired: ${timestamp}`);
    }
    const assetsOpRoleWeight = bytesToUint32(sig.slice(index, index + 4));
    index += 4;

    const sessionKey = erRecover(sig.slice(index, index + 66), hash);
    index += 66;

    const subDigestHsah = subDigest(
      0,
      walletAddress,
      keccak256(defaultAbiCoder.encode(["address", "uint32", "uint32"], [sessionKey, timestamp, assetsOpRoleWeight])),
    );
    const [succ, _emailType, roleWeight] = validateSignature(subDigestHsah, sig.slice(index), keysetHash);
    return succ && roleWeight.assetsOpWeight >= assetsOpRoleWeight;
  } else {
    const [succ] = validateSignature(hash, sig.slice(index), keysetHash);
    return succ;
  }
}

function bytesToUint32(input: Uint8Array): number {
  return input.reduce((pre, cur, i) => {
    return pre + cur * 256 ** (3 - i);
  });
}

function erRecover(sig: Uint8Array, hash: string): string {
  if (sig.length < 66) {
    throw new Error(`Invalid sig: ${sig}`);
  }
  let digestHash;
  if (sig[65] === 1) {
    digestHash = hash;
  } else if (sig[65] === 2) {
    digestHash = hashMessage(arrayify(hash));
  } else {
    throw new Error(`Invalid key type: ${sig[65]}`);
  }
  return recoverAddress(digestHash, sig.slice(0, 65));
}

function validateSignature(hash: string, sig: Uint8Array, keysetHash: string): [boolean, EmailType, RoleWeight] {
  let index = 0;
  let tmpEmailType = EmailType.None;
  let roleWeight = new RoleWeight(0, 0, 0);
  let parsedKeysetHash = "0x";
  while (index < sig.length - 1) {
    const { isSig, emailType, ret, keyType, index: _index } = parseKey(hash, sig, index);
    index = _index;
    if (emailType !== EmailType.None && tmpEmailType === EmailType.None) {
      tmpEmailType = emailType;
    } else if (emailType !== EmailType.None) {
      if (tmpEmailType !== EmailType.None && tmpEmailType !== emailType) {
        throw new Error(`Not unanimous email type: ${emailType}`);
      }
      tmpEmailType = emailType;
    }
    const ownerWeight = bytesToUint32(sig.slice(index, index + 4));
    index += 4;
    const assetsOpRoleWeight = bytesToUint32(sig.slice(index, index + 4));
    index += 4;
    const guardianWeight = bytesToUint32(sig.slice(index, index + 4));
    index += 4;
    const keyRoleWeight = new RoleWeight(ownerWeight, assetsOpRoleWeight, guardianWeight);
    if (isSig) {
      roleWeight = roleWeight.add(keyRoleWeight);
    }
    parsedKeysetHash = solidityKeccak256(
      ["bytes", "uint8", "bytes", "bytes"],
      [parsedKeysetHash, keyType, ret, keyRoleWeight.serialize()],
    );
  }

  return [keysetHash === parsedKeysetHash && roleWeight.assetsOpWeight >= 100, tmpEmailType, roleWeight];
}

function parseKey(
  hash: string,
  signature: Uint8Array,
  startIndex: number,
): { isSig: boolean; emailType: EmailType; keyType: KeyType; ret: string; index: number } {
  let index = startIndex;
  const keyType = signature[index] as KeyType;
  index++;

  let ret: string;
  let isSig: boolean;
  const emailType = EmailType.None;

  switch (keyType) {
    case KeyType.Secp256k1: {
      isSig = signature[index] === 1;
      index++;
      if (isSig) {
        ret = erRecover(signature.slice(index), hash);
        index += 66;
      } else {
        ret = hexlify(signature.slice(index, index + 20));
        index += 20;
      }
      break;
    }
    case KeyType.OpenIDWithEmail: {
      isSig = signature[index] === 1;
      index++;
      if (isSig) {
        throw new Error("Not support openID and email dkim validating");
      }
      ret = hexlify(signature.slice(index, index + 32));
      index += 32;
      break;
    }
    case KeyType.ERC1271Wallet: {
      isSig = signature[index] === 1;
      index++;
      if (isSig) {
        throw new Error("Not support Erc1271 Wallet validating");
      }
      ret = hexlify(signature.slice(index, index + 20));
      index += 20;
      break;
    }
    default: {
      throw new Error(`Unknown KeyType: ${keyType}`);
    }
  }
  return { ret, isSig, keyType, emailType, index };
}
