import { BigNumber, BytesLike } from "ethers";
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

  public build(): Transaction {
    return new Transaction(
      CallType.Call,
      this.gasLimit,
      this.target,
      this.value,
      this.data
    );
  }
}
