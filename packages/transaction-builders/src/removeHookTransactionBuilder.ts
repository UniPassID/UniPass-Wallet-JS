import { RoleWeight } from "@unipasswallet/keys";
import { CallType, Transaction } from "@unipasswallet/transactions";
import { ModuleMainInterface } from "@unipasswallet/utils";
import { BigNumber, BytesLike, constants, utils } from "ethers";
import { BaseTxBuilder } from "./baseTxBuilder";

export class RemoveHookTransactionBuilder extends BaseTxBuilder {
  public readonly userAddr: string;

  public readonly selector: string;

  constructor(
    public readonly revertOnError: boolean,
    public readonly gasLimit: BigNumber,
    _userAddr: BytesLike,
    _selector: BytesLike,
    public readonly value: BigNumber = constants.Zero,
    preGenerateSignatureFunc?: (builder: RemoveHookTransactionBuilder) => Promise<boolean>,
  ) {
    super(undefined, preGenerateSignatureFunc);
    this.userAddr = utils.hexlify(_userAddr);
    this.selector = utils.hexlify(_selector);
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
    const data = ModuleMainInterface.encodeFunctionData("removeHook", [this.selector]);
    return {
      _isUnipassWalletTransaction: true,
      callType: CallType.Call,
      revertOnError: this.revertOnError,
      gasLimit: this.gasLimit,
      target: this.userAddr,
      value: this.value,
      data,
    };
  }
}
