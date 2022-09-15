import {
  KeySecp256k1,
  KeyEmailDkim,
  RoleWeight,
  KeyBase,
  KeySecp256k1Wallet,
  KeyERC1271,
} from ".";
import { BytesLike } from "ethers";
import { keccak256, solidityPack } from "ethers/lib/utils";

export function getKeysetHash(keys: KeyBase[]): string {
  let keysetHash = "0x";
  keys.forEach((key) => {
    keysetHash = keccak256(
      solidityPack(["bytes", "bytes"], [keysetHash, key.serialize()])
    );
  });

  return keysetHash;
}

export class Keyset {
  constructor(public readonly keys: KeyBase[]) {}

  static create(
    registerEmail: string,
    registerEmailPepper: BytesLike,
    masterKey: KeySecp256k1,
    guardians: KeyBase[],
    policy?: KeyBase,
    registerEmailRoleWeight: RoleWeight = new RoleWeight(60, 0, 60)
  ): Keyset {
    const registerEmailKey = new KeyEmailDkim(
      registerEmail,
      registerEmailPepper,
      registerEmailRoleWeight
    );
    const keys = [masterKey as KeyBase, registerEmailKey].concat(guardians);

    if (policy) {
      keys.push(policy);
    }

    return new Keyset(keys);
  }

  public hash(): string {
    return getKeysetHash(this.keys);
  }

  public toJson(): string {
    return `[${this.keys
      .map((v) => {
        if (KeyEmailDkim.isKeyEmailDkim(v)) {
          return `{"KeyEmailDkim":${v.toJson()}}`;
        }

        if (KeyERC1271.isKeyERC1271(v)) {
          return `{"KeyERC1271":${v.toJson()}}`;
        }

        if (KeySecp256k1.isKeySecp256k1(v)) {
          return `{"KeySecp256k1":${v.toJson()}}`;
        }

        if (KeySecp256k1Wallet.isKeySecp256k1Wallet(v)) {
          return `{"KeySecp256k1Wallet":${v.toJson()}}`;
        }
        throw new Error("Not Valid KeyBase");
      })
      .join(",")}]`;
  }

  public static fromJson(json: string): Keyset {
    return new Keyset(
      (JSON.parse(json) as any[]).map((v) => {
        if (v.KeyEmailDkim) {
          return KeyEmailDkim.fromJsonObj(v.KeyEmailDkim);
        }

        if (v.KeyERC1271) {
          return KeyERC1271.fromJsonObj(v.KeyERC1271);
        }

        if (v.KeySecp256k1) {
          return KeySecp256k1.fromJsonObj(v.KeySecp256k1);
        }

        if (v.KeySecp256k1Wallet) {
          return KeySecp256k1Wallet.fromJsonObj(v.KeySecp256k1Wallet);
        }
        throw new Error("Invalid KeyBase");
      })
    );
  }
}
