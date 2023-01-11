import { KeyType, RoleWeight } from ".";
import { BytesLike } from "ethers";

export abstract class KeyBase {
  constructor(public roleWeight: RoleWeight) {}

  public abstract generateSignature(digestHash: BytesLike): Promise<string>;

  public abstract generateKey(): string;

  public abstract serialize(): string;

  public serializeRoleWeight(): string {
    return this.roleWeight.serialize();
  }

  public abstract keyType(): KeyType;
}
