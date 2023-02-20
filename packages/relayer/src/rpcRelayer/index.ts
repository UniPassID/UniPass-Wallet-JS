import { UnipassWalletContext } from "@unipasswallet/network";
import { FeeOption, Relayer } from "..";
import fetchPonyfill from "fetch-ponyfill";
import {
  PendingExecuteCallArgs,
  RpcService,
  SimulateArgs,
  SimulateExecute,
  SimulateKey,
  SimulateResult,
  TxnReceiptResult,
} from "./rpcService";
import { BigNumber, providers } from "ethers";

export * from "./rpcService";

export class RpcRelayer implements Relayer {
  public readonly rpcService: RpcService;

  constructor(
    relayerUrl: string,
    public readonly context: UnipassWalletContext,
    public readonly provider: providers.Provider,
    originFetch?: typeof fetch
  ) {
    this.rpcService = new RpcService(relayerUrl, originFetch || fetchPonyfill().fetch);
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

  async getNonce(walletAddr: string): Promise<BigNumber> {
    try {
      const nonce = BigNumber.from(await this.rpcService.nonce(walletAddr));
      return nonce;
    } catch (e) {
      return BigNumber.from(0);
    }
  }

  async getMetaNonce(walletAddr: string): Promise<BigNumber> {
    try {
      const metaNonce = await this.rpcService.metaNonce(walletAddr);
      return metaNonce;
    } catch (e) {
      return BigNumber.from(0);
    }
  }

  relay(transactions: PendingExecuteCallArgs): Promise<string> {
    return this.rpcService.sendTransaction(transactions);
  }

  async simulate(
    target: string,
    keyset: SimulateKey[],
    execute: SimulateExecute,
    token?: string,
  ): Promise<SimulateResult> {
    const args: SimulateArgs = {
      target,
      keyset,
      execute,
      token,
    };
    return this.rpcService.simulate(args);
  }

  async wait(txHash: string): Promise<TxnReceiptResult> {
    return this.rpcService.txRecipt(txHash);
  }
}
