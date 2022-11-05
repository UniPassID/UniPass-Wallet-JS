import { BigNumber, providers } from "ethers";
import { ChainType, TransactionProps, UnipassWalletProps, WalletProvider } from "./interface/unipassWalletProvider";
import { AxiosInstance } from "axios";
import requestFactory from "./api/axios";
import {
  genSignMessage,
  getWallet,
  verifySignature,
  innerGenerateTransferTx,
  innerEstimateTransferGas,
  sendTransaction,
} from "./operate";
import { getApiConfig } from "./config";
import { wallets } from "@unipasswallet/sdk";

export * from "./interface/unipassWalletProvider";
export * from "./config/index";
export * from "./utils/tss-worker";

export default class UnipassWalletProvider implements WalletProvider {
  public static instance: UnipassWalletProvider;

  public static request: AxiosInstance;

  private config: UnipassWalletProps | undefined;

  static getInstance(props: UnipassWalletProps) {
    if (!UnipassWalletProvider.instance) {
      const ins = new UnipassWalletProvider(props);
      UnipassWalletProvider.instance = ins;
    }

    return UnipassWalletProvider.instance;
  }

  private constructor(props: UnipassWalletProps) {
    this.config = props;
    const { backend } = getApiConfig(props);
    this.init(backend);
  }

  private async init(backend: string) {
    UnipassWalletProvider.request = requestFactory(backend);
  }

  public async estimateTransferTransactionsGasLimits(props: TransactionProps) {
    const { tx, chain, fee } = props;
    const _chain = chain ?? "polygon";
    const transactions = await innerGenerateTransferTx(tx, _chain, this.config);
    return innerEstimateTransferGas(transactions, chain, this.config, fee);
  }

  // public async sendTransaction(
  //   transactions: wallets.BundledTransaction | wallets.ExecuteTransaction,
  //   chainType?: ChainType,
  //   feeToken?: string,
  // ) {
  //   const chain = chainType ?? "polygon";
  //   return sendTransaction(transactions, chain, this.config, keyset, feeToken);
  // }

  public async transaction(props: TransactionProps): Promise<providers.TransactionReceipt> {
    const { tx, chain, fee } = props;
    const _chain = chain ?? "polygon";
    const generatedTx = await innerGenerateTransferTx(tx, _chain, this.config);
    const transactions = await innerEstimateTransferGas(generatedTx, _chain, this.config, fee);

    // FIX ME: set gas limit for rangers to disable estimate gas in wallet
    if (_chain === "rangers") transactions.gasLimit = BigNumber.from("1000000");

    return sendTransaction(transactions, chain, this.config, props.keyset, fee.token);
  }

  public async signMessage(message: string) {
    const result = await genSignMessage(message, this.config);
    return result;
  }

  public async verifySignMessage(message: string, signature: string): Promise<boolean> {
    const isValid = await verifySignature(message, signature, this.config);
    return isValid;
  }

  public async wallet(chain: ChainType = "polygon") {
    const wallet = await getWallet(this.config, chain);
    return wallet;
  }
}
