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

// export type ExecuteTransaction = {
//   type: "Execute";
//   transactions: Transactionish[] | Transactionish;
//   sessionKeyOrSignerIndex: SessionKey | number[];
//   preSignFunc?: (chainId: number, address: string, txs: Transaction[], nonce: BigNumber) => Promise<boolean>;
//   gasLimit: BigNumber;
//   nonce: BigNumber;
// };

// export function toSimulateExecute(execute: ExecuteTransaction): SimulateExecute {
//   const { transactions, sessionKeyOrSignerIndex, nonce } = execute;
//   const txs = toUnipassTransactions(transactions);
//   let signature;
//   if (Array.isArray(sessionKeyOrSignerIndex)) {
//     signature = sessionKeyOrSignerIndex;
//   } else {
//     throw new Error("Cannot Convert Session to Simulate Transaction Signature");
//   }
//   return { txs, nonce: hexlify(nonce), signature };
// }

// export function isExecuteTransaction(tx: any): tx is ExecuteTransaction {
//   return tx.type === "Execute";
// }
