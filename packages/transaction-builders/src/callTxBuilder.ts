import { BigNumber, BytesLike, utils } from "ethers";
import { RoleWeight } from "@unipasswallet/keys";
import { BaseTxBuilder } from "./baseTxBuilder";
import { Transaction, CallType } from "@unipasswallet/transactions";

export class CallTxBuilder extends BaseTxBuilder {
  public readonly target: string;

  public readonly data: string;

  constructor(
    public readonly revertOnError: boolean,
    public readonly gasLimit: BigNumber,
    _target: BytesLike,
    public readonly value: BigNumber,
    _data: BytesLike,
    preGenerateSignatureFunc?: (builder: CallTxBuilder) => Promise<boolean>,
  ) {
    super(undefined, preGenerateSignatureFunc);
    this.target = utils.hexlify(_target);
    this.data = utils.hexlify(_data);
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
      _isUnipassWalletTransaction: true,
      callType: CallType.Call,
      revertOnError: this.revertOnError,
      gasLimit: this.gasLimit,
      target: this.target,
      value: this.value,
      data: this.data,
    };
  }
}
