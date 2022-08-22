import { KeyBase } from "./keyBase";
import { BytesLike, utils } from "ethers";
import { KeyType, RoleWeight, SignFlag } from ".";

export class KeyERC1271 extends KeyBase {
  constructor(
    public readonly address: BytesLike,
    roleWeight: RoleWeight,
    public readonly signFunc: (digestHash: BytesLike) => Promise<string>
  ) {
    super(roleWeight);
  }

  public async generateSignature(digestHash: string): Promise<string> {
    return utils.solidityPack(
      ["uint8", "uint8", "bytes", "bytes"],
      [
        KeyType.ERC1271Wallet,
        SignFlag.Sign,
        await this.signFunc(digestHash),
        this.serializeRoleWeight(),
      ]
    );
  }

  public generateKey(): string {
    return utils.solidityPack(
      ["uint8", "uint8", "address", "bytes"],
      [
        KeyType.ERC1271Wallet,
        SignFlag.NotSign,
        this.address,
        this.serializeRoleWeight(),
      ]
    );
  }

  public serialize(): string {
    return utils.solidityPack(
      ["uint8", "address", "bytes"],
      [KeyType.ERC1271Wallet, this.address, this.serializeRoleWeight()]
    );
  }
}
