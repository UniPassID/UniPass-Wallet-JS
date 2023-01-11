import { providers } from "ethers";
import { ChainType, TransactionProps, UnipassWalletProps, WalletProvider } from "./interface/unipassWalletProvider";
import { AxiosInstance } from "axios";
import requestFactory from "./api/axios";
import {
  genSignMessage,
  getWallet,
  verifySignature,
  innerGenerateTransferTx,
  sendTransaction,
  genSignTypedDataMessage,
  innerSimulateExecute,
  operateToRawExecuteCall,
} from "./operate";
import { getApiConfig } from "./config";
import { Keyset } from "@unipasswallet/keys";
import { wallets } from "@unipasswallet/sdk";
import { MessageTypes, TypedMessage } from "./interface";

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

  public async simulateTransactions(props: TransactionProps) {
    const { tx, chain, fee, keyset } = props;
    const _chain = chain ?? "polygon";
    const transactions = await innerGenerateTransferTx(tx, _chain, this.config, keyset, fee);
    return innerSimulateExecute(transactions, chain, this.config);
  }

  public async sendTransaction(
    transactions: wallets.RawMainExecuteCall | wallets.RawBundledExecuteCall,
    keyset: Keyset,
    chainType?: ChainType,
  ) {
    const chain = chainType ?? "polygon";
    return sendTransaction(transactions, chain, this.config, keyset);
  }

  public async transaction(props: TransactionProps): Promise<providers.TransactionResponse> {
    const { tx, chain, fee, keyset } = props;
    if (!fee) {
      throw new Error("Please specify token for sending Transactions");
    }
    const _chain = chain ?? "polygon";
    const generatedTx = await innerGenerateTransferTx(tx, _chain, this.config, keyset, fee);

    const execute = operateToRawExecuteCall(generatedTx);

    // FIX ME: set gas limit for rangers to disable estimate gas in wallet
    // if (_chain === "rangers") simulateResult.feeTokens = simulateResult.feeTokens.map( BigNumber.from("1000000"));

    return sendTransaction(execute, chain, this.config, keyset);
  }

  public async signMessage(message: string, keyset: Keyset, isEIP191Prefix = false) {
    const result = await genSignMessage(message, this.config, keyset, isEIP191Prefix);
    return result;
  }

  public async signTypedDataMessage<T extends MessageTypes>(
    data: TypedMessage<T>,
    message: Uint8Array,
    keyset: Keyset,
  ) {
    const result = await genSignTypedDataMessage(data, message, this.config, keyset);
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
