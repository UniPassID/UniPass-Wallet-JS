import { KeyBase } from "./keyBase";
import { BytesLike, utils } from "ethers";
import { KeyType, RoleWeight, SignFlag, SignType } from ".";
import { defineReadOnly } from "ethers/lib/utils";

export class KeySecp256k1 extends KeyBase {
  public readonly address: string;

  public readonly _isKeySecp256k1: boolean;

  constructor(
    _address: BytesLike,
    roleWeight: RoleWeight,
    private signType: SignType,
    public signFunc?: (
      digestHash: BytesLike,
      signType: SignType
    ) => Promise<string>
  ) {
    super(roleWeight);
    this.address = utils.hexlify(_address);
    defineReadOnly(this, "_isKeySecp256k1", true);
  }

  static isKeySecp256k1(value: any): value is KeySecp256k1 {
    return !!(
      value &&
      value._isKeySecp256k1 &&
      RoleWeight.isRoleWeight(value.roleWeight)
    );
  }

  public toJson() {
    return JSON.stringify({
      address: this.address,
      roleWeight: this.roleWeight.toJsonObj(),
      signType: this.signType,
    });
  }

  static fromJsonObj(obj: any): KeySecp256k1 {
    return new KeySecp256k1(
      obj.address,
      RoleWeight.fromJsonObj(obj.roleWeight),
      obj.signType
    );
  }

  public getSignType(): SignType {
    return this.signType;
  }

  public setSignType(v: SignType) {
    this.signType = v;
  }

  public async generateSignature(digestHash: string): Promise<string> {
    return utils.solidityPack(
      ["uint8", "uint8", "bytes", "bytes"],
      [
        KeyType.Secp256k1,
        SignFlag.Sign,
        await this.signFunc!(digestHash, this.signType),
        this.serializeRoleWeight(),
      ]
    );
  }

  public generateKey(): string {
    return utils.solidityPack(
      ["uint8", "uint8", "address", "bytes"],
      [
        KeyType.Secp256k1,
        SignFlag.NotSign,
        this.address,
        this.serializeRoleWeight(),
      ]
    );
  }

  public serialize(): string {
    return utils.solidityPack(
      ["uint8", "address", "bytes"],
      [KeyType.Secp256k1, this.address, this.serializeRoleWeight()]
    );
  }
}
