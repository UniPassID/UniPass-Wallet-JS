import { BytesLike, utils } from "ethers";
import { moduleMain } from "@unipasswallet/abi";
import { RoleWeight } from "@unipasswallet/keys";
import { Wallet } from "@unipasswallet/wallet";
import { Transaction } from "../transaction";

export abstract class BaseTxBuilder {
  public readonly contractInterface: utils.Interface;

  private _signature: string;

  constructor(signature?: BytesLike) {
    this.contractInterface = new utils.Interface(moduleMain.abi);

    if (signature) {
      this._signature = utils.hexlify(signature);
    }
  }

  public get signature(): string {
    return this._signature;
  }

  public set signature(v: BytesLike) {
    this._signature = utils.hexlify(v);
  }

  abstract build(): Transaction;

  abstract digestMessage(): string;

  async generateSignature(
    wallet: Wallet,
    signerIndexes: number[]
  ): Promise<BaseTxBuilder> {
    const notSessionKey = 0;
    const digestHash = this.digestMessage();
    const sig = utils.solidityPack(
      ["uint8", "bytes"],
      [notSessionKey, await wallet.signMessage(digestHash, signerIndexes)]
    );

    if (!this.validateRoleWeight(wallet.getSignRoleWeight(signerIndexes))) {
      throw new Error(`Invalid Role Weight To Sign`);
    }

    this.signature = sig;

    return this;
  }

  abstract validateRoleWeight(roleWeight: RoleWeight): boolean;
}
