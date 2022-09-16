import { BigNumber, providers } from "ethers";
import { SessionKey, Wallet } from "@unipasswallet/wallet";
import TssWorker from "./utils/tss-worker";
import { ChainName, UnipassWalletProps, UniTransaction, WalletProvider } from "./interface/unipassWalletProvider";
import api from "./api/backend";
import { getApiConfig, getChainConfig } from "./config";
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
} from "./operate";

export default class UnipassWalletProvider extends providers.JsonRpcProvider implements WalletProvider {
  public static instance: UnipassWalletProvider;

  public static request: AxiosInstance;

  private mailServices: Array<string> | undefined;

  private policyAddress: string | undefined;

  private email: string | undefined;

  private authChainNode: ChainName | undefined;

  private upAuthToken: string | undefined;

  private pwsToken: string | undefined;

  private password: string | undefined;

  private wallet: Wallet;

  static getInstance(props: UnipassWalletProps) {
    if (!UnipassWalletProvider.instance) {
      const ins = new UnipassWalletProvider(props);
      UnipassWalletProvider.instance = ins;
    }

    return UnipassWalletProvider.instance;
  }

  private constructor(props: UnipassWalletProps) {
    const { chainName, url, env, network } = props;

    if (chainName) {
      const { rpc_url, chainId } = getChainConfig(env, chainName);
      super(rpc_url, { name: chainName, chainId });
    } else {
      super(url, network);
    }
    const { backend } = getApiConfig(env);
    this.init(backend);
    this.authChainNode = chainName;
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
    const wallet = await doRegister(password, this.email, this.upAuthToken, this.policyAddress);
    this.wallet = wallet;
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
   * @params login
   * * */
  public async login(code: string) {
    const upAuthToken = await verifyOtpCode(this.email, code, "auth2Fa", this.mailServices);
    const wallet = await doLogin(this.email, this.password, upAuthToken, this.pwsToken);
    this.upAuthToken = upAuthToken;
    this.wallet = wallet;
  }

  public async sendSyncEmail() {
    await syncEmail(this.email, this.upAuthToken, this.authChainNode);
  }

  public async transaction(tx: UniTransaction, chainName?: ChainName) {
    const chain = chainName || this.authChainNode;
    const txs = await genTransaction(tx, this.email, chain);
    if (this.wallet) {
      await this.wallet.sendTransaction(txs);
    }
  }

  public async getBalance_(_blockTag?: string | number): Promise<BigNumber> {
    if (this.wallet) {
      const balance = await this.wallet.getBalance(_blockTag);
      return balance;
    }
  }

  public async signMessage(
    message: string,
    sessionKeyOrSignerIndexes: number[] | SessionKey = [],
    isDigest: boolean = true,
  ) {
    if (this.wallet) {
      this.wallet.signMessage(message, sessionKeyOrSignerIndexes, isDigest);
    }
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
    this.wallet = undefined;
  }
}
