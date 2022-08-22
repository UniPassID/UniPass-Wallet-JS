import { KeySecp256k1, KeyEmailDkim, RoleWeight, KeyBase } from "./key";
import { getKeysetHash } from "./utils";

export class Keyset {
  /**
   * @dev This class is used for Unipass-Wallet. If users changed their keysetHashs, this class may lose efficacy.
   *      Keys are sorted by `[MasterKey, RegisterEmailKey, Guardians, Policy]`
   * @param keys Inner Keys.
   */
  constructor(public readonly keys: KeyBase[]) {}

  static new(
    registerEmail: string,
    masterKey: KeySecp256k1,
    guardians: KeyBase[],
    policy?: KeyBase,
    registerEmailRoleWeight?: RoleWeight
  ): Keyset {
    const registerEmailKey = new KeyEmailDkim(
      registerEmail,
      registerEmailRoleWeight || {
        ownerWeight: 40,
        assetsOpWeight: 100,
        guardianWeight: 0,
      }
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
}
