import { Transaction, Transactionish, toTransaction } from "@unipasswallet/transactions";
import { ExecuteCall, toUnipassTransaction } from "@unipasswallet/relayer";
import { ModuleGuestInterface } from "@unipasswallet/utils";
import { MainExecuteTransaction } from "./mainExecuteTransaction";
import { hexlify } from "ethers/lib/utils";
import { constants } from "ethers";

export class BundledExecuteCall {
  public readonly txs: Transaction[];

  constructor(txs: Transactionish | MainExecuteTransaction | (Transactionish | MainExecuteTransaction)[]) {
    this.txs = BundledExecuteCall.toTransactions(txs);
  }

  public toExecuteCall(): ExecuteCall {
    return { txs: this.txs.map((tx) => toUnipassTransaction(tx)), signature: "0x", nonce: hexlify(0) };
  }

  public static toTransaction(tx: Transactionish | MainExecuteTransaction): Transaction {
    if (MainExecuteTransaction.isMainExecuteTransaction(tx)) {
      return tx.toTransaction();
    }
    return toTransaction(tx);
  }

  public static toTransactions(
    txs: Transactionish | MainExecuteTransaction | (Transactionish | MainExecuteTransaction)[],
  ): Transaction[] {
    if (Array.isArray(txs)) {
      return txs.map((v) => BundledExecuteCall.toTransaction(v));
    }
  }

  public ethAbiEncode(): string {
    return ModuleGuestInterface.encodeFunctionData("execute", [this.txs, constants.Zero, "0x"]);
  }
}

// export type BundledTransaction = {
//   type: "Bundled";
//   transactions:
//     | (executeTransaction.ExecuteTransaction | Transactionish)[]
//     | executeTransaction.ExecuteTransaction
//     | Transactionish;
//   gasLimit: BigNumber;
// };

// export function isBundledTransaction(tx: any): tx is BundledTransaction {
//   return tx.type === "Bundled";
// }

// export function toSimulateExecuteTransaction(
//   tx: executeTransaction.ExecuteTransaction | Transactionish,
// ): SimulateTransaction | UnipassTransaction {
//   if (executeTransaction.isExecuteTransaction(tx)) {
//     const execute =  executeTransaction.toSimulateExecute(tx);
//     return {execute,}
//   } else {
//     return toUnipassTransaction(tx);
//   }
// }

// export function toSimulateExecuteTransactions(
//   txs:
//     | (executeTransaction.ExecuteTransaction | Transactionish)[]
//     | executeTransaction.ExecuteTransaction
//     | Transactionish,
// ): (SimulateTransaction | UnipassTransaction)[] {
//   if (Array.isArray(txs)) {
//     return txs.map((v) => toSimulateExecuteTransaction(v));
//   } else {
//     return [toSimulateExecuteTransaction(txs)];
//   }
// }
