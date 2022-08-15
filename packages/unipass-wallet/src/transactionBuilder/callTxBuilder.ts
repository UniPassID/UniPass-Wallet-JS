import { BigNumber, BytesLike } from "ethers";
import { RoleWeight } from "../key";
import { CallType, Transaction } from "../transaction";
import { BaseTxBuilder } from "./baseTxBuilder";

export class CallTxBuilder extends BaseTxBuilder {
  constructor(
    public gasLimit: BigNumber,
    public target: BytesLike,
    public value: BigNumber,
    public data: BytesLike
  ) {
    super();
  }

  // eslint-disable-next-line class-methods-use-this
  digestMessage(): string {
    throw new Error("Not Need Digest Message");
  }

  // eslint-disable-next-line class-methods-use-this, @typescript-eslint/no-unused-vars
  validateRoleWeight(_roleWeight: RoleWeight): boolean {
    throw new Error("Not Need Validate Role Weight");
  }

  public build(): Transaction {
    return {
      callType: CallType.Call,
      gasLimit: this.gasLimit,
      target: this.target,
      value: this.value,
      data: this.data,
    };
  }
}
