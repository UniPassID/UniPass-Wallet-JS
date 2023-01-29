import { RawMainExecuteCall } from "./rawMainExecuteCall";
import { BigNumber, BytesLike, constants } from "ethers";
import { defineReadOnly, hexlify } from "ethers/lib/utils";
import { CallType } from "@unipasswallet/transactions";
import { SimulateTransaction } from "@unipasswallet/relayer";

export interface RawMainExecuteTransactionOpts {
  rawExecuteCall: RawMainExecuteCall;
  gasLimit?: BigNumber;
  revertOnError?: boolean;
  target: BytesLike;
  value?: BigNumber;
  callType?: CallType;
}

export class RawMainExecuteTransaction {
  public readonly _isRawMainExecuteTransaction: boolean;

  public readonly target: string;

  public readonly rawExecuteCall: RawMainExecuteCall;

  public readonly gasLimit: BigNumber;

  public readonly revertOnError: boolean;

  public readonly value: BigNumber;

  public readonly callType: CallType;

  constructor(opts: RawMainExecuteTransactionOpts) {
    const {
      rawExecuteCall,
      gasLimit = constants.Zero,
      revertOnError = true,
      target,
      value = constants.Zero,
      callType = CallType.Call,
    } = opts;
    this.target = hexlify(target);
    this.rawExecuteCall = rawExecuteCall;
    this.gasLimit = gasLimit;
    this.callType = callType;
    this.revertOnError = revertOnError;
    this.value = value;

    defineReadOnly(this, "_isRawMainExecuteTransaction", true);
  }

  public opts(): RawMainExecuteTransactionOpts {
    return {
      rawExecuteCall: this.rawExecuteCall,
      gasLimit: this.gasLimit,
      revertOnError: this.revertOnError,
      target: this.target,
      value: this.value,
      callType: this.callType,
    };
  }

  public static isRawMainExecuteTransaction(v: any): v is RawMainExecuteTransaction {
    return v._isRawMainExecuteTransaction;
  }

  public toSimulateTransaction(): SimulateTransaction {
    return { execute: this.rawExecuteCall.toSimulateExecute(), target: this.target, revertOnError: this.revertOnError };
  }
}
