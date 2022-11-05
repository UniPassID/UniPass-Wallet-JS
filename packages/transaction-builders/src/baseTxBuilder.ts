import { BytesLike, utils } from "ethers";
import { moduleMain } from "@unipasswallet/abi";
import { RoleWeight } from "@unipasswallet/keys";
import { Wallet } from "@unipasswallet/wallet";
import { Transaction } from "@unipasswallet/transactions";
import { arrayify } from "ethers/lib/utils";

export abstract class BaseTxBuilder {
  public readonly contractInterface: utils.Interface;

  private _signature: string;

  constructor(
    signature?: BytesLike,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public readonly preGenerateSignatureFunc: (builder: BaseTxBuilder) => Promise<boolean> = (_) => {
      return new Promise((resolve) => {
        resolve(true);
      });
    },
  ) {
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

  async generateSignature(wallet: Wallet, signerIndexes: number[]): Promise<BaseTxBuilder> {
    if (!(await this.preGenerateSignatureFunc(this))) {
      throw new Error("PreGenerateSignature Failed");
    }
    const digestHash = this.digestMessage();
    const sig = await wallet.signMessage(arrayify(digestHash), signerIndexes);

    if (!this.validateRoleWeight(wallet.getSignRoleWeight(signerIndexes))) {
      throw new Error(`Invalid Role Weight To Sign`);
    }

    this.signature = sig;

    return this;
  }

  abstract validateRoleWeight(roleWeight: RoleWeight): boolean;
}
