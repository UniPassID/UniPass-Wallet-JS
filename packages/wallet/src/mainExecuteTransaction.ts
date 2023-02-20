import { CallType, Transaction } from "@unipasswallet/transactions";
import { BigNumber, constants } from "ethers";
import { BytesLike, defineReadOnly, hexlify } from "ethers/lib/utils";
import { MainExecuteCall } from "./mainExecuteCall";

export interface MainExecuteTransactionOpts {
  executeCall: MainExecuteCall;
  gasLimit?: BigNumber;
  revertOnError?: boolean;
  target: BytesLike;
  value?: BigNumber;
  callType?: CallType;
}

export class MainExecuteTransaction {
  public readonly _isMainExecuteTransaction: true;

  public readonly target: string;

  public readonly executeCall: MainExecuteCall;

  public readonly gasLimit: BigNumber;

  public readonly revertOnError: boolean;

  public readonly value: BigNumber;

  public readonly callType: CallType;

  constructor(opts: MainExecuteTransactionOpts) {
    const {
      executeCall,
      gasLimit = constants.Zero,
      revertOnError = true,
      target,
      value = constants.Zero,
      callType = CallType.Call,
    } = opts;
    this.target = hexlify(target);
    this.executeCall = executeCall;
    this.gasLimit = gasLimit;
    this.callType = callType;
    this.revertOnError = revertOnError;
    this.value = value;
    defineReadOnly(this, "_isMainExecuteTransaction", true);
  }

  public toJson(): string {
    return `{"_isMainExecuteTransaction":true,"target":"${
      this.target
    }","executeCall": ${this.executeCall.toJson()},"gasLimit":"${hexlify(this.gasLimit)}","revertOnError":${
      this.revertOnError
    },"value":"${hexlify(this.value)}","callType":${this.callType}}`;
  }

  public static fromJsonObj(obj: any): MainExecuteTransaction {
    if (obj._isMainExecuteTransaction !== true) {
      throw new Error("Expected _isMainExecuteTransaction to be true");
    }
    return new MainExecuteTransaction({
      executeCall: MainExecuteCall.fromJsonObj(obj.executeCall),
      gasLimit: obj.gasLimit ? BigNumber.from(obj.gasLimit) : undefined,
      revertOnError: obj.revertOnError,
      target: obj.target ? hexlify(obj.target) : undefined,
      value: obj.value ? BigNumber.from(obj.value) : undefined,
      callType: obj.callType,
    });
  }

  public toTransaction(): Transaction {
    const data = this.executeCall.ethAbiEncode();

    return {
      _isUnipassWalletTransaction: true,
      callType: this.callType,
      revertOnError: this.revertOnError,
      gasLimit: this.gasLimit,
      target: this.target,
      value: this.value,
      data,
    };
  }

  public static isMainExecuteTransaction(v: any): v is MainExecuteTransaction {
    return v._isMainExecuteTransaction;
  }
}
