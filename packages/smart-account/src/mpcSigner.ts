import { Bytes, Signer, Wallet, providers } from "ethers";
import { base64, hexlify, toUtf8String } from "ethers/lib/utils";
import { Provider, TransactionRequest } from "@ethersproject/abstract-provider";
import { Deferrable, defineReadOnly } from "@ethersproject/properties";
import { KeySecp256k1, Keyset, RoleWeight, SignType } from "@unipasswallet/keys";
import {
  Fetch,
  MpcRunningEnv,
  MpcSignerInitOptions,
  MpcSignerOptions,
  SmartAccountError,
  SmartAccountErrorCode,
  UnipassKeyType,
  Web3AuthSig,
} from "./interface";
import { MpcStorage } from "./mpcStorage";
import { MpcClient } from "./mpcClient";
import { getMpcServerInfo } from "./utils";
import Web3Auth from "@web3auth/single-factor-auth";
import { decryptKeystore, encryptKeystore } from "@unipasswallet/utils";
import * as crossFetch from "cross-fetch";

export class MpcSigner extends Signer {
  private readonly storage?: MpcStorage;

  private address: string;

  private userKey: string;

  private authorization: string;

  private mpcClient: MpcClient;

  readonly provider?: providers.Provider;

  public readonly _isMpcSigner: boolean;

  constructor(options: MpcSignerOptions) {
    const { storage } = options;
    super();

    this.storage = new MpcStorage(storage);
    defineReadOnly(this, "_isMpcSigner", true);
  }

  static isMpcSigner(value: any): value is MpcSigner {
    return !!(value && value._isMpcSigner);
  }

  /**
   *
   * @param initOptions The initalization options
   * @returns
   */
  async init(initOptions?: MpcSignerInitOptions): Promise<MpcSigner> {
    const {
      idToken,
      noStorage = false,
      fetch = crossFetch.fetch,
      runningEnv = MpcRunningEnv.Production,
      appId,
      expireationInterval,
    } = initOptions || {};
    if (!noStorage) {
      return this.initByStorage(runningEnv, fetch);
    }

    if (!idToken || !appId) {
      const error = {
        code: SmartAccountErrorCode.MpcInitFailed,
        data: undefined,
        message: "Expected id token and app id",
      } as SmartAccountError<undefined>;
      throw error;
    }

    return this.initByIdToken(appId, idToken, runningEnv, fetch, expireationInterval);
  }

  private async initByStorage(runningEnv: MpcRunningEnv, fetch: Fetch): Promise<MpcSigner> {
    const mpcInfo = await this.storage?.getMpcSignerInfo();
    if (!mpcInfo) {
      const error = {
        code: SmartAccountErrorCode.MpcStorageMissing,
        data: undefined,
        message: "MPC storage missed",
      } as SmartAccountError<undefined>;
      throw error;
    }
    const { userKey, authorization, address } = mpcInfo;
    if (MpcSigner.isAuthorizationExpired(authorization)) {
      const error = {
        code: SmartAccountErrorCode.MpcAuthorizationExpired,
        data: undefined,
        message: "MPC authorization expired",
      } as SmartAccountError<undefined>;
      throw error;
    }

    const { mpcServerUrl } = getMpcServerInfo(runningEnv);

    this.mpcClient = new MpcClient(mpcServerUrl, fetch);
    this.userKey = userKey;
    this.authorization = authorization;
    this.address = address;

    return this;
  }

  private async initByIdToken(
    appId: string,
    idToken: string,
    runningEnv: MpcRunningEnv,
    fetch: Fetch,
    expirationInterval?: string,
  ): Promise<MpcSigner> {
    const { mpcServerUrl, chainId, env, nodeUrl } = getMpcServerInfo(runningEnv);
    const mpcClient = new MpcClient(mpcServerUrl, fetch);

    const {
      web3authConfig: { clientId, verifierName },
      verifierIdKey,
    } = await mpcClient.config(appId, chainId);
    const web3AuthPrivateKey = await MpcSigner.getWeb3AuthPrivateKey(
      clientId,
      idToken,
      verifierName,
      verifierIdKey,
      chainId,
      env,
      nodeUrl,
    );

    if (!web3AuthPrivateKey) {
      const error = {
        code: SmartAccountErrorCode.Web3AuthLoginFailed,
        message: "Web3Auth Login Failed",
        data: undefined,
      } as SmartAccountError<undefined>;
      throw error;
    }

    const web3AuthSig = await MpcSigner.getIdTokenWeb3AuthSig(idToken, web3AuthPrivateKey);

    const { isRegistered, authorization, unipassInfo } = await mpcClient.login(appId, web3AuthSig, expirationInterval);
    if (isRegistered && unipassInfo) {
      const { keyset, keystore } = unipassInfo;
      const userKey = await decryptKeystore(keystore, web3AuthPrivateKey);
      this.mpcClient = new MpcClient(mpcServerUrl, fetch);
      this.userKey = userKey;
      this.authorization = authorization;
      this.address = (Keyset.fromJson(keyset).keys[0] as KeySecp256k1).address;
    } else {
      const { tssKeyAddress, userKeySignContext } = await mpcClient.tssGenerateKey(authorization);
      const keystore = await encryptKeystore(userKeySignContext, web3AuthPrivateKey, {
        scrypt: { N: 16 },
      });
      const masterKey = new KeySecp256k1(tssKeyAddress, new RoleWeight(100, 100, 100), SignType.EthSign);
      const keyset = new Keyset([masterKey]);

      const { authorization: registerAuthorization } = await mpcClient.register({
        keysetJson: keyset.toJson(),
        masterKey: {
          masterKeyAddress: tssKeyAddress,
          keystore,
          keyType: UnipassKeyType.ToBusiness,
        },
        web3Auth: web3AuthSig,
      });
      this.mpcClient = new MpcClient(mpcServerUrl, fetch);
      this.userKey = userKeySignContext;
      this.authorization = registerAuthorization;
      this.address = masterKey.address;
    }
    return this;
  }

  private static async getIdTokenWeb3AuthSig(idToken: string, web3AuthPrivateKey: string): Promise<Web3AuthSig> {
    const payload = idToken.split(".")[1];
    const message = toUtf8String(base64.decode(payload));
    const wallet = new Wallet(web3AuthPrivateKey);
    const sig = await wallet.signMessage(message);
    return {
      message,
      sig,
      address: wallet.address,
    };
  }

  private static async getWeb3AuthPrivateKey(
    clientId: string,
    idToken: string,
    verifier: string,
    subKey: string,
    chainId: number,
    web3AuthNetwork: "testnet" | "mainnet",
    nodeUrl: string,
  ): Promise<string | undefined> {
    const web3Auth = new Web3Auth({
      clientId,
      chainConfig: { chainNamespace: "eip155", chainId: hexlify(chainId), rpcTarget: nodeUrl },
      web3AuthNetwork,
    });
    web3Auth.init();
    const verifierId = MpcSigner.getIdTokenSub(idToken, subKey);
    if (!verifierId) {
      const error = {
        code: SmartAccountErrorCode.InvalidIdToken,
        data: undefined,
        message: "Invalid Id Token",
      } as SmartAccountError<undefined>;

      throw error;
    }
    const provider = await web3Auth.connect({ verifier, idToken, verifierId });
    if (provider) {
      const privateKey = await provider.request<string>({ method: "eth_private_key" });
      if (privateKey) {
        return privateKey;
      }
    }
    return undefined;
  }

  private static getAuthorizationExpires(authorization: string): number | undefined {
    const payload = authorization.split(".")[1];
    if (payload) {
      const decodedPayload = JSON.parse(base64.decode(payload).toString());
      return decodedPayload.exp;
    }
    return undefined;
  }

  private static isAuthorizationExpired(authorization: string): boolean {
    const exp = MpcSigner.getAuthorizationExpires(authorization);
    return !(exp && exp > new Date().getTime() / 1000);
  }

  private static getIdTokenSub(idToken: string, subKey: string): string | undefined {
    const payload = idToken.split(".")[1];
    if (payload) {
      const decodedPayload = JSON.parse(base64.decode(payload).toString());
      return decodedPayload[subKey];
    }
    return undefined;
  }

  connect(provider: Provider): MpcSigner {
    defineReadOnly(this, "provider", provider);
    return this;
  }

  async signMessage(message: Bytes | string): Promise<string> {
    throw new Error("Unsupport");
  }

  async getAddress(): Promise<string> {
    return this.address;
  }

  async signTransaction(transaction: Deferrable<TransactionRequest>): Promise<string> {
    throw new Error("Unsupport");
  }
}
