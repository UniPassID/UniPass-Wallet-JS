import { Transaction, Transactionish, toTransaction } from "@unipasswallet/transactions";
import { SimulateExecute, toUnipassTransaction } from "@unipasswallet/relayer";
import { RawMainExecuteTransaction } from "./rawMainExecuteTransaction";
import { hexlify } from "ethers/lib/utils";

export class RawBundledExecuteCall {
  public readonly txs: (Transaction | RawMainExecuteTransaction)[];

  constructor(txs: Transactionish | RawMainExecuteTransaction | (Transactionish | RawMainExecuteTransaction)[]) {
    this.txs = RawBundledExecuteCall.toTransactions(txs);
  }

  public pushTransaction(tx: Transactionish | RawMainExecuteTransaction): RawBundledExecuteCall {
    const { txs } = this;
    txs.push(RawBundledExecuteCall.toTransaction(tx));
    return new RawBundledExecuteCall(txs);
  }

  public static toTransaction(tx: Transactionish | RawMainExecuteTransaction): Transaction | RawMainExecuteTransaction {
    if (RawMainExecuteTransaction.isRawMainExecuteTransaction(tx)) {
      return tx;
    }
    return toTransaction(tx);
  }

  public static toTransactions(
    txs: Transactionish | RawMainExecuteTransaction | (Transactionish | RawMainExecuteTransaction)[],
  ): (Transaction | RawMainExecuteTransaction)[] {
    if (Array.isArray(txs)) {
      return txs.map((v) => RawBundledExecuteCall.toTransaction(v));
    } else {
      return [RawBundledExecuteCall.toTransaction(txs)];
    }
  }

  public toSimulateExecute(): SimulateExecute {
    return {
      txs: this.txs.map((tx) => {
        if (RawMainExecuteTransaction.isRawMainExecuteTransaction(tx)) {
          return tx.toSimulateTransaction();
        } else {
          return toUnipassTransaction(tx);
        }
      }),
      nonce: hexlify(0),
      signature: "0x",
    };
  }
}
