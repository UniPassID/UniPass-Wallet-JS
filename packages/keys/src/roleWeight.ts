import { defineReadOnly, solidityPack } from "ethers/lib/utils";

export class RoleWeight {
  public readonly _isRoleWeight: boolean;

  constructor(
    public readonly ownerWeight: number,
    public readonly assetsOpWeight: number,
    public readonly guardianWeight: number
  ) {
    defineReadOnly(this, "_isRoleWeight", true);
  }

  public static zero(): RoleWeight {
    return new RoleWeight(0, 0, 0);
  }

  public serialize(): string {
    return solidityPack(
      ["uint32", "uint32", "uint32"],
      [this.ownerWeight, this.assetsOpWeight, this.guardianWeight]
    );
  }

  static isRoleWeight(value: any): value is RoleWeight {
    return !!(value && value._isRoleWeight);
  }

  static fromJsonObj(obj: any): RoleWeight {
    return new RoleWeight(
      obj.ownerWeight,
      obj.assetsOpWeight,
      obj.guardianWeight
    );
  }

  public toJson(): string {
    return JSON.stringify(this.toJsonObj());
  }

  public toJsonObj() {
    return {
      ownerWeight: this.ownerWeight,
      assetsOpWeight: this.assetsOpWeight,
      guardianWeight: this.guardianWeight,
    };
  }

  public add(other: RoleWeight): RoleWeight {
    return new RoleWeight(
      this.ownerWeight + other.ownerWeight,
      this.assetsOpWeight + other.assetsOpWeight,
      this.guardianWeight + other.guardianWeight
    );
  }

  eq(other: RoleWeight): boolean {
    return (
      this.ownerWeight === other.ownerWeight &&
      this.assetsOpWeight === other.assetsOpWeight &&
      this.guardianWeight === other.guardianWeight
    );
  }

  lt(other: RoleWeight): boolean {
    return (
      this.ownerWeight < other.ownerWeight &&
      this.assetsOpWeight < other.assetsOpWeight &&
      this.guardianWeight < other.guardianWeight
    );
  }

  lte(other: RoleWeight): boolean {
    return (
      this.ownerWeight <= other.ownerWeight &&
      this.assetsOpWeight <= other.assetsOpWeight &&
      this.guardianWeight <= other.guardianWeight
    );
  }

  gt(other: RoleWeight): boolean {
    return (
      this.ownerWeight > other.ownerWeight &&
      this.assetsOpWeight > other.assetsOpWeight &&
      this.guardianWeight > other.guardianWeight
    );
  }

  gte(other: RoleWeight): boolean {
    return (
      this.ownerWeight >= other.ownerWeight &&
      this.assetsOpWeight >= other.assetsOpWeight &&
      this.guardianWeight >= other.guardianWeight
    );
  }
}
