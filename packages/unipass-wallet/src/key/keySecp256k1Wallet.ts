import { KeyBase } from "./keyBase";
import { utils, Wallet } from "ethers";
import { KeyType, RoleWeight, sign, SignFlag, SignType } from ".";

export class KeySecp256k1Wallet extends KeyBase {
  constructor(
    private _secp256k1Wallet: Wallet,
    roleWeight: RoleWeight,
    private _signType: SignType
  ) {
    super(roleWeight);
  }

  public get secp256k1Wallet(): Wallet {
    return this._secp256k1Wallet;
  }

  public set secp256k1Wallet(v: Wallet) {
    this._secp256k1Wallet = v;
  }

  public get signType(): SignType {
    return this._signType;
  }

  public set signType(v: SignType) {
    this._signType = v;
  }

  public async generateSignature(digestHash: string): Promise<string> {
    return utils.solidityPack(
      ["uint8", "uint8", "bytes", "bytes"],
      [
        KeyType.Secp256k1,
        SignFlag.Sign,
        await sign(digestHash, this._secp256k1Wallet, this.signType),
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
        this._secp256k1Wallet.address,
        this.serializeRoleWeight(),
      ]
    );
  }

  public serialize(): string {
    return utils.solidityPack(
      ["uint8", "address", "bytes"],
      [
        KeyType.Secp256k1,
        this._secp256k1Wallet.address,
        this.serializeRoleWeight(),
      ]
    );
  }
}
