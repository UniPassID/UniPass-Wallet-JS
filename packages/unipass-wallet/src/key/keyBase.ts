import { RoleWeight, serializeRoleWeight } from ".";
import { BytesLike } from "ethers";

export abstract class KeyBase {
  constructor(private _roleWeight: RoleWeight) {}

  public get roleWeight(): RoleWeight {
    return this._roleWeight;
  }

  public set roleWeight(v: RoleWeight) {
    this._roleWeight = v;
  }

  public abstract generateSignature(digestHash: BytesLike): Promise<string>;

  public abstract generateKey(): string;

  public abstract serialize(): string;

  public serializeRoleWeight(): string {
    return serializeRoleWeight(this._roleWeight);
  }
}
