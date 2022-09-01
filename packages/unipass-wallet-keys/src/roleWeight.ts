import { solidityPack } from "ethers/lib/utils";

export class RoleWeight {
  constructor(
    public readonly ownerWeight: number,
    public readonly assetsOpWeight: number,
    public readonly guardianWeight: number
  ) {}

  public static zero(): RoleWeight {
    return new RoleWeight(0, 0, 0);
  }

  public serialize(): string {
    return solidityPack(
      ["uint32", "uint32", "uint32"],
      [this.ownerWeight, this.assetsOpWeight, this.guardianWeight]
    );
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
