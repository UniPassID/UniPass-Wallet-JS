import { providers } from "ethers";
import TssWorker from "./utils/tss-worker";
import { UnipassWalletProps, WalletProvider } from "./interface/unipassWalletProvider";
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
  getAccountAddress,
} from "./operate";

export default class UnipassWalletProvider extends providers.JsonRpcProvider implements WalletProvider {
  public static instance: UnipassWalletProvider;

  public static request: AxiosInstance;

  private mailServices: Array<string> | undefined;

  private policyAddress: string | undefined;

  private email: string | undefined;

  private upAuthToken: string | undefined;

  private pwsToken: string | undefined;

  private password: string | undefined;

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
  }

  private async init(backend: string) {
    UnipassWalletProvider.request = requestFactory(backend);
    await TssWorker.initLindellEcdsaWasm();
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
    await doRegister(password, this.email, this.upAuthToken, this.policyAddress, this);
  }

  public async loginCode(email: string) {
    await getVerifyCode(email, "auth2Fa", this.mailServices);
    this.email = email;
  }

  public async verifyLoginCode(code: string) {
    const upAuthToken = await verifyOtpCode(this.email, code, "auth2Fa", this.mailServices);
    this.upAuthToken = upAuthToken;
  }

  public async passwordToken(email: string, password: string) {
    const pwsToken = await getPasswordToken(email, password);
    this.pwsToken = pwsToken;
    this.password = password;
  }

  public async login(code: string) {
    await this.verifyLoginCode(code);
    await doLogin(this.email, this.password, this.upAuthToken, this.pwsToken);
  }

  public async getAccountAddress() {
    const account = await getAccountAddress(this.email);
    return account;
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

  // isSynced() {
  //   api;
  // }

  // sync() {
  //   api.sendEmail();
  // }

  // sendCallTx(txs) {
  //   if (!sync) {
  //     error("need sync");
  //     return;
  //   }
  //   this.wallet.sendTx([syncTx, ...txs]);
  // }

  // signMessage(message: string) {
  //   this.wallet.signMessage(message);
  // }
}
