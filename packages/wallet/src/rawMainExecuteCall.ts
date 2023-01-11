import { Transaction, Transactionish, toTransaction, toTransactions } from "@unipasswallet/transactions";
import { SimulateExecute, toUnipassTransaction } from "@unipasswallet/relayer";
import { BigNumber } from "ethers";
import { SessionKey } from "./sessionKey";
import { defineReadOnly, hexlify } from "ethers/lib/utils";

export class RawMainExecuteCall {
  public readonly _isRawMainExecuteCall: boolean;

  public readonly txs: Transaction[];

  constructor(
    txs: Transactionish | Transactionish[],
    public readonly nonce: BigNumber,
    public readonly sessionKeyOrSignerIndexes: SessionKey | number[],
    public readonly preSignFunc: (
      chainId: number,
      address: string,
      txs: Transaction[],
      nonce: BigNumber,
    ) => Promise<boolean> = () => {
      return new Promise((resolve) => {
        resolve(true);
      });
    },
  ) {
    this.txs = toTransactions(txs);

    defineReadOnly(this, "_isRawMainExecuteCall", true);
  }

  public static isRawMainExecuteCall(v: any): v is RawMainExecuteCall {
    return v._isRawMainExecuteCall;
  }

  public toSimulateExecute(): SimulateExecute {
    if (Array.isArray(this.sessionKeyOrSignerIndexes)) {
      return {
        txs: this.txs.map((tx) => toUnipassTransaction(tx)),
        nonce: hexlify(this.nonce),
        signature: this.sessionKeyOrSignerIndexes,
      };
    } else {
      throw new Error("Session Key Not Support for Simulate Transactions");
    }
  }

  public pushTransaction(tx: Transactionish): RawMainExecuteCall {
    const { txs, nonce, sessionKeyOrSignerIndexes, preSignFunc } = this;
    txs.push(toTransaction(tx));
    return new RawMainExecuteCall(txs, nonce, sessionKeyOrSignerIndexes, preSignFunc);
  }
}
