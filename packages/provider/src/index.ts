import { providers } from "ethers";
import TssWorker from "./utils/tss-worker";
import {
  ChainType,
  Environment,
  TransactionProps,
  UnipassWalletProps,
  WalletProvider,
} from "./interface/unipassWalletProvider";
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
  syncEmail,
  genTransaction,
  checkLocalStatus,
  genSignMessage,
  getWallet,
  ckeckSyncStatus,
  verifySignature,
} from "./operate";
import { getApiConfig } from "./config";

export * from "./interface/unipassWalletProvider";

export default class UnipassWalletProvider implements WalletProvider {
  public static instance: UnipassWalletProvider;

  public static request: AxiosInstance;

  private mailServices: Array<string> | undefined;

  private policyAddress: string | undefined;

  private email: string | undefined;

  private chainType: ChainType = "polygon";

  private upAuthToken: string | undefined;

  private pwsToken: string | undefined;

  private password: string | undefined;

  private env: Environment = "prod";

  static getInstance(props: UnipassWalletProps) {
    if (!UnipassWalletProvider.instance) {
      const ins = new UnipassWalletProvider(props);
      UnipassWalletProvider.instance = ins;
    }

    return UnipassWalletProvider.instance;
  }

  private constructor(props: UnipassWalletProps) {
    const { env } = props;
    this.env = env;
    const { backend } = getApiConfig(env);
    this.init(backend);
  }

  private async init(backend: string) {
    UnipassWalletProvider.request = requestFactory(backend);
    await TssWorker.initLindellEcdsaWasm();
    const { data } = await api.getSuffixes();
    this.mailServices = data.suffixes;
    this.policyAddress = data.policyAddress;
  }

  /**
   * get email verify code when registry
   * @params email
   * * */
  public async registerCode(email: string) {
    await getVerifyCode(email, "signUp", this.mailServices);
    this.email = email;
  }

  /**
   * verify your code when register
   * @params code
   * * */
  public async verifyRegisterCode(code: string) {
    const upAuthToken = await verifyOtpCode(this.email, code, "signUp", this.mailServices);
    this.upAuthToken = upAuthToken;
  }

  /**
   * register
   * @params password
   * * */
  public async register(password: string) {
    await doRegister(password, this.email, this.upAuthToken, this.policyAddress, this.env);
  }

  /**
   * check password
   * @params password
   * * */
  public async passwordToken(email: string, password: string) {
    const pwsToken = await getPasswordToken(email, password);
    this.pwsToken = pwsToken;
    this.password = password;
  }

  /**
   * get email verify code when login
   * @params email
   * * */
  public async loginCode(email: string) {
    await getVerifyCode(email, "auth2Fa", this.mailServices);
    this.email = email;
  }

  /**
   * login
   * @params code
   * * */
  public async login(code: string) {
    const upAuthToken = await verifyOtpCode(this.email, code, "auth2Fa", this.mailServices);
    await doLogin(this.email, this.password, upAuthToken, this.pwsToken);
    this.upAuthToken = upAuthToken;
  }

  public async transaction(props: TransactionProps): Promise<providers.TransactionReceipt> {
    const { tx, fee, chain } = props;
    const _chain = chain ?? "polygon";
    const transactionReceipt = await genTransaction(tx, this.email, _chain, this.env, fee);
    return transactionReceipt;
  }

  public async signMessage(message: string) {
    const result = await genSignMessage(message, this.email, this.env);
    return result;
  }

  public async verifySignMessage(message: string, signature: string): Promise<boolean> {
    const isValid = await verifySignature(message, signature, this.email, this.env);
    return isValid;
  }

  public async wallet(chain: ChainType = "polygon") {
    const wallet = await getWallet(this.email, this.env, chain);
    return wallet;
  }

  /**
   * isLoggedIn
   */
  public async isLoggedIn() {
    const email = await checkLocalStatus(this.env);
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
