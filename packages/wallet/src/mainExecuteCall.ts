import { BigNumber, BytesLike } from "ethers";
import { defineReadOnly, hexlify } from "ethers/lib/utils";
import { ModuleMainInterface } from "@unipasswallet/utils";
import { ExecuteCall, toUnipassTransaction } from "@unipasswallet/relayer";
import { Transaction, Transactionish, toTransactions } from "@unipasswallet/transactions";

export class MainExecuteCall {
  public readonly _isMainExecuteCall: boolean;

  public readonly signature: string;

  public readonly txs: Transaction[];

  constructor(txs: Transactionish | Transactionish[], public readonly nonce: BigNumber, signature: BytesLike) {
    this.txs = toTransactions(txs);
    this.signature = hexlify(signature);
    defineReadOnly(this, "_isMainExecuteCall", true);
  }

  public ethAbiEncode(): string {
    return ModuleMainInterface.encodeFunctionData("execute", [this.txs, this.nonce, this.signature]);
  }

  public toExecuteCall(): ExecuteCall {
    return {
      txs: this.txs.map((tx) => toUnipassTransaction(tx)),
      signature: this.signature,
      nonce: hexlify(this.nonce),
    };
  }

  public static isMainExecuteCall(v: any): v is MainExecuteCall {
    return v._isMainExecuteCall;
  }
}
