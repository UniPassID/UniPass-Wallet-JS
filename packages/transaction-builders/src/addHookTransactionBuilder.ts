import { RoleWeight } from "@unipasswallet/keys";
import { CallType, Transaction } from "@unipasswallet/transactions";
import { ModuleMainInterface } from "@unipasswallet/utils";
import { BigNumber, BytesLike, constants, utils } from "ethers";
import { BaseTxBuilder } from "./baseTxBuilder";

export class AddHookTransactionBuilder extends BaseTxBuilder {
  public readonly userAddr: string;

  public readonly selector: string;

  public readonly implementation: string;

  constructor(
    public readonly revertOnError: boolean,
    public readonly gasLimit: BigNumber,
    _userAddr: BytesLike,
    _selector: BytesLike,
    _implementation: BytesLike,
    public readonly value: BigNumber = constants.Zero,
    preGenerateSignatureFunc?: (builder: AddHookTransactionBuilder) => Promise<boolean>,
  ) {
    super(undefined, preGenerateSignatureFunc);
    this.userAddr = utils.hexlify(_userAddr);
    this.selector = utils.hexlify(_selector);
    this.implementation = utils.hexlify(_implementation);
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
    const data = ModuleMainInterface.encodeFunctionData("addHook", [this.selector, this.implementation]);
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
