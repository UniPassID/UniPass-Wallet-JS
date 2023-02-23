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
import { ModuleMainInterface } from "@unipasswallet/utils";
import { BigNumber, Contract, Signer, constants } from "ethers";

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
      const nonce = await new Contract(walletAddr, ModuleMainInterface, this.signer.provider).getNonce();

      return nonce + 1;
    }

    return constants.Zero;
  }

  async getMetaNonce(walletAddr: string): Promise<BigNumber> {
    if (await this.isWalletDeployed(walletAddr)) {
      const metaNonce = await new Contract(walletAddr, ModuleMainInterface, this.signer.provider).getMetaNonce();

      return metaNonce;
    }

    return constants.Zero;
  }

  async relay(transactions: PendingExecuteCallArgs): Promise<string> {
    const call: ExecuteCall = JSON.parse(transactions.call);
    const ret = await new Contract(transactions.walletAddress, ModuleMainInterface, this.signer).execute(
      call.txs,
      call.nonce,
      call.signature,
    );

    return ret.hash;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async simulate(target: string, keyset: SimulateKey[], execute: SimulateExecute): Promise<SimulateResult> {
    return {
      feeTokens: [],
      discount: 0,
      feeReceiver: constants.AddressZero,
      isFeeRequired: false,
      gasPrice: constants.Zero.toHexString(),
    };
  }

  async wait(txHash: string): Promise<TxnReceiptResult> {
    return { receipt: await this.signer.provider!.getTransactionReceipt(txHash) };
  }
}
