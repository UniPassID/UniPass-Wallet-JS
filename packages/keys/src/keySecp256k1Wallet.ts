import { KeyBase } from "./keyBase";
import { utils, Wallet } from "ethers";
import { KeyType, RoleWeight, sign, SignFlag, SignType } from ".";
import { defineReadOnly } from "ethers/lib/utils";

export class KeySecp256k1Wallet extends KeyBase {
  public readonly _isKeySecp256k1Wallet: boolean;

  constructor(
    public wallet: Wallet,
    roleWeight: RoleWeight,
    private signType: SignType
  ) {
    super(roleWeight);
    defineReadOnly(this, "_isKeySecp256k1Wallet", true);
  }

  static isKeySecp256k1Wallet(value: any): value is KeySecp256k1Wallet {
    return !!(value && value._isKeySecp256k1Wallet);
  }

  public toJson() {
    return JSON.stringify({
      wallet: this.wallet.privateKey,
      roleWeight: this.roleWeight,
      signType: this.signType,
    });
  }

  static fromJsonObj(obj: any): KeySecp256k1Wallet {
    return new KeySecp256k1Wallet(
      new Wallet(obj.wallet),
      obj.roleWeight,
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
        await sign(digestHash, this.wallet, this.signType),
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
        this.wallet.address,
        this.serializeRoleWeight(),
      ]
    );
  }

  public serialize(): string {
    return utils.solidityPack(
      ["uint8", "address", "bytes"],
      [KeyType.Secp256k1, this.wallet.address, this.serializeRoleWeight()]
    );
  }
}
