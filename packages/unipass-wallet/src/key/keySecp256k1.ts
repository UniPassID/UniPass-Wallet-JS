import { KeyBase } from "./keyBase";
import { utils, Wallet } from "ethers";
import { KeyType, RoleWeight, sign, SignType } from ".";

export class KeySecp256k1 extends KeyBase {
  constructor(
    readonly keySecp256k1: Wallet,
    private signType: SignType,
    roleWeight: RoleWeight
  ) {
    super(roleWeight);
  }

  public changeSignType(_signType: SignType): KeySecp256k1 {
    this.signType = _signType;
    return this;
  }

  public async generateSignature(digestHash: string): Promise<string> {
    return utils.solidityPack(
      ["uint8", "uint8", "bytes", "bytes"],
      [
        KeyType.Secp256k1,
        1,
        await sign(digestHash, this.keySecp256k1, this.signType),
        this.serializeRoleWeight(),
      ]
    );
  }

  public generateKey(): string {
    return utils.solidityPack(
      ["uint8", "uint8", "address", "bytes"],
      [
        KeyType.Secp256k1,
        0,
        this.keySecp256k1.address,
        this.serializeRoleWeight(),
      ]
    );
  }

  public serialize(): string {
    return utils.solidityPack(
      ["uint8", "address", "bytes"],
      [KeyType.Secp256k1, this.keySecp256k1.address, this.serializeRoleWeight()]
    );
  }
}
