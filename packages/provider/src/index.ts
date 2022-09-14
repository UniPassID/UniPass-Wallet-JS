import { providers } from "ethers";
import TssWorker from "./utils/tss-worker";
import WalletProvider from "./interface/unipassWalletProvider";
import api from "./api/backend";
import { getApiConfig, getChainConfig } from "./config";
import { AxiosInstance } from "axios";
import requestFactory from "./api/axios";
import { getVerifyCode, verifyOtpCode, doRegister, getPasswordToken, doLogin } from "./operate";

interface UnipassWalletProps {
  chainName: "polygon" | "bsc" | "rangers";
  env: "dev" | "test" | "prod";
}

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
    const { rpc_url } = getChainConfig(props.env, props.chainName);
    const { backend } = getApiConfig(props.env);
    super(rpc_url);
    this.init(backend);
  }

  private async init(backend: string) {
    UnipassWalletProvider.request = requestFactory(backend);
    await TssWorker.initLindellEcdsaWasm();
    const { data } = await api.getSuffixes();
    this.mailServices = data.suffixes;
    this.policyAddress = data.policyAddress;
  }

  public async sendCode(email: string) {
    await getVerifyCode(email, this.mailServices);
    this.email = email;
  }

  public async verifyCode(code: string) {
    const upAuthToken = await verifyOtpCode(this.email, code, this.mailServices);
    this.upAuthToken = upAuthToken;
  }

  public async register(password: string) {
    await doRegister(password, this.email, this.upAuthToken, this.policyAddress, this);
  }

  public async passwordToken(email: string, password: string) {
    const pwsToken = await getPasswordToken(email, password);
    this.pwsToken = pwsToken;
    this.password = password;
  }

  public async login(code: string) {
    await this.verifyCode(code);
    await doLogin(this.email, this.password, this.upAuthToken, this.pwsToken);
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
