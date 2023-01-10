import {
  ExecuteCall,
  PendingExecuteCallArgs,
  Relayer,
  SimulateExecute,
  SimulateKey,
  SimulateResult,
  TxnReceiptResult,
} from ".";
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
    let gasLimit = BigNumber.from(transactions.estimateGas);
    gasLimit = gasLimit.eq(constants.Zero) ? BigNumber.from(10_000_000) : gasLimit.add(80000);
    const ret = await new Contract(transactions.walletAddress, new Interface(moduleMain.abi), this.signer).execute(
      call.txs,
      call.nonce,
      call.signature,
      {
        gasLimit,
      },
    );

    return ret.hash;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async simulate(target: string, keyset: SimulateKey[], execute: SimulateExecute): Promise<SimulateResult> {
    return {
      feeTokens: [],
      discount: 100,
    };
  }

  async wait(txHash: string): Promise<TxnReceiptResult | undefined> {
    return {
      txHash,
      index: 0,
      status: 1,
      logs: [],
      receipts: [],
    };
  }
}
