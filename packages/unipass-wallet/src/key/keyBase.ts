import { RoleWeight } from ".";
import { BytesLike, utils } from "ethers";

export abstract class KeyBase {
  constructor(readonly roleWeight: RoleWeight) {}

  public abstract generateSignature(digestHash: BytesLike): Promise<string>;

  public abstract generateKey(): string;

  public abstract serialize(): string;

  public serializeRoleWeight(): string {
    return utils.solidityPack(
      ["uint32", "uint32", "uint32"],
      [
        this.roleWeight.ownerWeight,
        this.roleWeight.assetsOpWeight,
        this.roleWeight.guardianWeight,
      ]
    );
  }
}
