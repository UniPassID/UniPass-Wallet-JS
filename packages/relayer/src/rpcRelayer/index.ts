import { UnipassWalletContext } from "@unipasswallet/network";
import { FeeOption, Relayer } from "..";
import fetchPonyfill from "fetch-ponyfill";
import {
  PendingExecuteCallArgs,
  RpcService,
  TxnReciptResult,
} from "./rpcService";
import { BigNumberish, providers } from "ethers";

export * from "./rpcService";

export class RpcRelayer implements Relayer {
  public readonly rpcService: RpcService;

  constructor(
    relayerUrl: string,
    public readonly context: UnipassWalletContext,
    public readonly provider: providers.Provider
  ) {
    this.rpcService = new RpcService(relayerUrl, fetchPonyfill().fetch);
  }

  async isWalletDeployed(walletAddress: string): Promise<boolean> {
    if (!this.provider) {
      throw new Error("Bundled creation provider not found");
    }

    return (await this.provider.getCode(walletAddress)) !== "0x";
  }

  async getFeeOptions(gasLimit: string): Promise<{ options: FeeOption[] }> {
    const feeTokens = await this.rpcService.feeTokens();

    if (feeTokens.isFeeRequired) {
      return this.rpcService.feeOptions({ gasLimit });
    }

    return { options: [] };
  }

  async getNonce(walletAddr: string): Promise<BigNumberish> {
    if (await this.isWalletDeployed(walletAddr)) {
      return this.rpcService.nonce(walletAddr);
    }

    return 1;
  }

  async getMetaNonce(walletAddr: string): Promise<BigNumberish> {
    if (await this.isWalletDeployed(walletAddr)) {
      return this.rpcService.metaNonce(walletAddr);
    }

    return 1;
  }

  relay(transactions: PendingExecuteCallArgs): Promise<string> {
    return this.rpcService.sendTransaction(transactions);
  }

  wait(txHash: string): Promise<TxnReciptResult> {
    return this.rpcService.txRecipt(txHash);
  }
}
