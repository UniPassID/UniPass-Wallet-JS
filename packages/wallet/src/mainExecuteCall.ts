import { BigNumber, BytesLike } from "ethers";
import { defineReadOnly, hexlify } from "ethers/lib/utils";
import { ModuleMainInterface } from "@unipasswallet/utils";
import { ExecuteCall, toUnipassTransaction } from "@unipasswallet/relayer";
import {
  Transaction,
  Transactionish,
  toTransactions,
  transactionFromJsonObj,
  transactionToJson,
} from "@unipasswallet/transactions";

export class MainExecuteCall {
  public readonly _isMainExecuteCall: boolean;

  public readonly signature: string;

  public readonly txs: Transaction[];

  constructor(txs: Transactionish | Transactionish[], public readonly nonce: BigNumber, signature: BytesLike) {
    this.txs = toTransactions(txs);
    this.signature = hexlify(signature);
    defineReadOnly(this, "_isMainExecuteCall", true);
  }

  public toJson(): string {
    return `{"_isMainExecuteCall":true,"txs":[${this.txs
      .map((tx) => `${transactionToJson(tx)}`)
      .join(",")}],"nonce":"${hexlify(this.nonce)}","signature":"${this.signature}"}`;
  }

  public static fromJsonObj(obj: any): MainExecuteCall {
    if (obj._isMainExecuteCall !== true) {
      throw new Error("Expected _isMainExecuteCall to be true");
    }
    return new MainExecuteCall(
      obj.txs.map((tx) => transactionFromJsonObj(tx)),
      BigNumber.from(obj.nonce),
      obj.signature,
    );
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
