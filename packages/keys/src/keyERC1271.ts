import { KeyBase } from "./keyBase";
import { BytesLike, utils } from "ethers";
import { KeyType, RoleWeight, SignFlag } from ".";
import { defineReadOnly } from "ethers/lib/utils";

export class KeyERC1271 extends KeyBase {
  public readonly address: string;

  public readonly _isKeyERC1271: boolean;

  constructor(
    _address: BytesLike,
    roleWeight: RoleWeight,
    public signFunc?: (digestHash: BytesLike) => Promise<string>,
  ) {
    super(roleWeight);
    this.address = utils.hexlify(_address);
    defineReadOnly(this, "_isKeyERC1271", true);
  }

  static isKeyERC1271(value: any): value is KeyERC1271 {
    return !!(value && value._isKeyERC1271 && RoleWeight.isRoleWeight(value.roleWeight));
  }

  public toJson() {
    return JSON.stringify({
      address: this.address,
      roleWeight: this.roleWeight.toJsonObj(),
    });
  }

  static fromJsonObj(obj: any): KeyERC1271 {
    return new KeyERC1271(obj.address, RoleWeight.fromJsonObj(obj.roleWeight));
  }

  public async generateSignature(digestHash: string): Promise<string> {
    const sig = await this.signFunc(digestHash);

    return utils.solidityPack(
      ["uint8", "uint8", "address", "uint32", "bytes", "bytes"],
      [KeyType.ERC1271Wallet, SignFlag.Sign, this.address, sig.length / 2 - 1, sig, this.serializeRoleWeight()],
    );
  }

  public generateKey(): string {
    return utils.solidityPack(
      ["uint8", "uint8", "address", "bytes"],
      [KeyType.ERC1271Wallet, SignFlag.NotSign, this.address, this.serializeRoleWeight()],
    );
  }

  public serialize(): string {
    return utils.solidityPack(
      ["uint8", "address", "bytes"],
      [KeyType.ERC1271Wallet, this.address, this.serializeRoleWeight()],
    );
  }
}
