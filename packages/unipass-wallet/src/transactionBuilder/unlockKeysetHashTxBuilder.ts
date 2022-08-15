import { constants } from "ethers";
import { RoleWeight } from "../key";
import { CallType, Transaction } from "../transaction";
import { BaseTxBuilder } from "./baseTxBuilder";

export class UnlockKeysetHashTxBuilder extends BaseTxBuilder {
  /**
   *
   * @param userAddr Wallet Address
   * @param metaNonce MetaNonce
   */
  constructor(public userAddr: string, public metaNonce: number) {
    super();
  }

  // eslint-disable-next-line class-methods-use-this
  digestMessage(): string {
    throw new Error("Not Need Digest Message");
  }

  // eslint-disable-next-line class-methods-use-this, @typescript-eslint/no-unused-vars
  validateRoleWeight(_roleWeight: RoleWeight): boolean {
    return true;
  }

  public build(): Transaction {
    const data = this.contractInterface.encodeFunctionData("unlockKeysetHash", [
      this.metaNonce,
    ]);
    return {
      callType: CallType.Call,
      gasLimit: constants.Zero,
      target: this.userAddr,
      value: constants.Zero,
      data,
    };
  }
}
