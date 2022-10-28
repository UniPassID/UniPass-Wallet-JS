import { constants, providers } from "ethers";
import { ChainType, TransactionProps, UnipassWalletProps, WalletProvider } from "./interface/unipassWalletProvider";
import api from "./api/backend";
import { AxiosInstance } from "axios";
import requestFactory from "./api/axios";
import {
  getVerifyCode,
  verifyOtpCode,
  doRegister,
  getPasswordToken,
  doLogin,
  doLogout,
  checkLocalStatus,
  genSignMessage,
  getWallet,
  verifySignature,
  sendTransaction,
  innerGenerateTransactionTx,
  innerEstimateTransctionGas,
} from "./operate";
import { getApiConfig } from "./config";
import { wallets } from "@unipasswallet/sdk";

export * from "./interface/unipassWalletProvider";
export * from "./config/index";
export * from "./utils/tss-worker";

export default class UnipassWalletProvider implements WalletProvider {
  public static instance: UnipassWalletProvider;

  public static request: AxiosInstance;

  private mailServices: Array<string> | undefined;

  private policyAddress: string | undefined;

  private email: string | undefined;

  private upAuthToken: string | undefined;

  private pwsToken: string | undefined;

  private password: string | undefined;

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
    const { data } = await api.getSuffixes();
    this.mailServices = data.suffixes;
    this.policyAddress = data.policyAddress;
  }

  public async registerCode(email: string) {
    await getVerifyCode(email, "signUp", this.mailServices);
    this.email = email;
  }

  public async verifyRegisterCode(code: string) {
    const upAuthToken = await verifyOtpCode(this.email, code, "signUp", this.mailServices);
    this.upAuthToken = upAuthToken;
  }

  public async register(password: string) {
    await doRegister(password, this.email, this.upAuthToken, this.policyAddress, this.config);
  }

  public async passwordToken(email: string, password: string) {
    const pwsToken = await getPasswordToken(email, password);
    this.pwsToken = pwsToken;
    this.password = password;
  }

  public async loginCode(email: string) {
    await getVerifyCode(email, "auth2Fa", this.mailServices);
    this.email = email;
  }

  public async login(code: string) {
    const upAuthToken = await verifyOtpCode(this.email, code, "auth2Fa", this.mailServices);
    await doLogin(this.email, this.password, upAuthToken, this.pwsToken);
    this.upAuthToken = upAuthToken;
  }

  public async estimateTransactionsGasLimits(props: TransactionProps) {
    const { tx, chain } = props;
    const _chain = chain ?? "polygon";
    const transactions = await innerGenerateTransactionTx(tx, _chain, this.config);
    return innerEstimateTransctionGas(transactions, chain, this.config, {
      value: constants.Zero,
      token: constants.AddressZero,
    });
  }

  public async sendTransaction(
    transactions: wallets.BundledTransaction | wallets.ExecuteTransaction,
    chainType?: ChainType,
  ) {
    const chain = chainType ?? "polygon";
    return sendTransaction(transactions, chain, this.config);
  }

  public async transaction(props: TransactionProps): Promise<providers.TransactionReceipt> {
    const { tx, chain } = props;
    const _chain = chain ?? "polygon";
    const generatedTx = await innerGenerateTransactionTx(tx, _chain, this.config);
    const transactions = await innerEstimateTransctionGas(generatedTx, _chain, this.config, {
      value: constants.Zero,
      token: constants.AddressZero,
    });
    return sendTransaction(transactions, chain, this.config);
  }

  public async signMessage(message: string) {
    const result = await genSignMessage(message, this.email, this.config);
    return result;
  }

  public async verifySignMessage(message: string, signature: string): Promise<boolean> {
    const isValid = await verifySignature(message, signature, this.email, this.config);
    return isValid;
  }

  public async wallet(chain: ChainType = "polygon") {
    const wallet = await getWallet(this.email, this.config, chain);
    return wallet;
  }

  public async isLoggedIn() {
    const email = await checkLocalStatus(this.config);
    if (email) {
      this.email = email;
      return true;
    }
    return false;
  }

  public async logout() {
    await doLogout(this.email);
    this.clean();
  }

  private clean() {
    this.email = undefined;
    this.upAuthToken = undefined;
    this.pwsToken = undefined;
    this.password = undefined;
  }
}
