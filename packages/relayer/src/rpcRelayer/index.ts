import { UnipassWalletContext } from "@unipasswallet/network";
import { FeeOption, Relayer } from "..";
import fetchPonyfill from "fetch-ponyfill";
import { EstimateGasResult, PendingExecuteCallArgs, RpcService, TxnReceiptResult } from "./rpcService";
import { BigNumber, providers } from "ethers";

export * from "./rpcService";

export class RpcRelayer implements Relayer {
  public readonly rpcService: RpcService;

  constructor(
    relayerUrl: string,
    public readonly context: UnipassWalletContext,
    public readonly provider: providers.Provider,
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

  async getNonce(walletAddr: string): Promise<BigNumber> {
    if (await this.isWalletDeployed(walletAddr)) {
      const nonce = BigNumber.from(await this.rpcService.nonce(walletAddr)).add(1);
      return nonce;
    }

    return BigNumber.from(1);
  }

  async getMetaNonce(walletAddr: string): Promise<BigNumber> {
    try {
      const metaNonce = (await this.rpcService.metaNonce(walletAddr)).add(1);
      return metaNonce;
    } catch (e) {
      return BigNumber.from(1);
    }
  }

  relay(transactions: PendingExecuteCallArgs): Promise<string> {
    return this.rpcService.sendTransaction(transactions);
  }

  estimateGas(transactions: PendingExecuteCallArgs): Promise<EstimateGasResult> {
    return this.rpcService.estimateGas(transactions);
  }

  async wait(txHash: string): Promise<TxnReceiptResult | undefined> {
    const ret = await this.rpcService.txRecipt(txHash);
    if (ret !== undefined && ret !== null && ret.receipts.find((v) => v.status === 0) !== undefined) {
      ret.status = 3;
    }
    return ret;
  }
}
