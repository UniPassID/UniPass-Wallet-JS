import { ExecuteCall, FeeOption, PendingExecuteCallArgs, Relayer, TxnReciptResult } from ".";
import { UnipassWalletContext } from "@unipasswallet/network";
import { moduleMain } from "@unipasswallet/abi";
import { BigNumber, constants, Contract, Signer } from "ethers";
import { Interface } from "ethers/lib/utils";

export class LocalRelayer implements Relayer {
  constructor(public readonly context: UnipassWalletContext, public readonly signer: Signer) {}

  async isWalletDeployed(walletAddress: string): Promise<boolean> {
    if (!this.signer) {
      throw new Error("Bundled creation provider not found");
    }

    return (await this.signer.provider.getCode(walletAddress)) !== "0x";
  }

  async getFeeOptions(): Promise<{ options: Array<Pick<FeeOption, "to">> }> {
    const address = await this.signer.getAddress();
    return { options: [{ to: address }] };
  }

  async getNonce(walletAddr: string): Promise<BigNumber> {
    if (await this.isWalletDeployed(walletAddr)) {
      const nonce = await new Contract(walletAddr, new Interface(moduleMain.abi), this.signer.provider).getNonce();

      return nonce.add(1);
    }

    return BigNumber.from(1);
  }

  async getMetaNonce(walletAddr: string): Promise<BigNumber> {
    if (await this.isWalletDeployed(walletAddr)) {
      const metaNonce = await new Contract(
        walletAddr,
        new Interface(moduleMain.abi),
        this.signer.provider,
      ).getMetaNonce();

      return metaNonce.add(1);
    }

    return BigNumber.from(1);
  }

  async relay(transactions: PendingExecuteCallArgs): Promise<string> {
    const call: ExecuteCall = JSON.parse(transactions.call);
    const ret = await new Contract(transactions.walletAddress, new Interface(moduleMain.abi), this.signer).execute(
      call.txs,
      call.nonce,
      call.signature,
      {
        gasLimit: BigNumber.from(transactions.estimateGas),
      },
    );

    return ret.hash;
  }

  async wait(txHash: string): Promise<TxnReciptResult | undefined> {
    return {
      txHash,
      index: 0,
      status: "",
      logs: [],
    };
  }
}
