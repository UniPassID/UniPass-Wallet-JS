import {
  ExecuteCall,
  FeeOption,
  PendingExecuteCallArgs,
  Relayer,
  TxnReciptResult,
} from ".";
import { UnipassWalletContext } from "@unipasswallet/network";
import { moduleMain } from "@unipasswallet/abi";
import { BigNumberish, Contract, Signer } from "ethers";
import { Interface } from "ethers/lib/utils";

export class LocalRelayer implements Relayer {
  constructor(
    public readonly context: UnipassWalletContext,
    public readonly signer: Signer
  ) {}

  async isWalletDeployed(walletAddress: string): Promise<boolean> {
    if (!this.signer) {
      throw new Error("Bundled creation provider not found");
    }

    return (await this.signer.provider.getCode(walletAddress)) !== "0x";
  }

  async getFeeOptions(): Promise<{ options: FeeOption[] }> {
    return { options: [] };
  }

  async getNonce(walletAddr: string): Promise<BigNumberish> {
    if (await this.isWalletDeployed(walletAddr)) {
      const nonce = await new Contract(
        walletAddr,
        new Interface(moduleMain.abi),
        this.signer.provider
      ).getNonce();

      return nonce;
    }

    return 1;
  }

  async getMetaNonce(walletAddr: string): Promise<BigNumberish> {
    if (await this.isWalletDeployed(walletAddr)) {
      const metaNonce = await new Contract(
        walletAddr,
        new Interface(moduleMain.abi),
        this.signer.provider
      ).getMetaNonce();

      return metaNonce;
    }

    return 1;
  }

  async relay(transactions: PendingExecuteCallArgs): Promise<string> {
    const call: ExecuteCall = JSON.parse(transactions.call);
    const ret = await new Contract(
      transactions.walletAddress,
      new Interface(moduleMain.abi),
      this.signer
    ).execute(call.txs, call.nonce, call.signature);

    return ret.hash;
  }

  async wait(txHash: string): Promise<TxnReciptResult> {
    return {
      txHash,
      index: 0,
      status: "",
      logs: [],
    };
  }
}
