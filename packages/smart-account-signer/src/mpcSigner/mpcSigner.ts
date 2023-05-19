import { Bytes, Signer, Wallet, providers } from "ethers";
import { base64, computeAddress, toUtf8Bytes, toUtf8String } from "ethers/lib/utils";
import { Provider, TransactionRequest } from "@ethersproject/abstract-provider";
import { Deferrable, defineReadOnly } from "@ethersproject/properties";
import { KeySecp256k1, Keyset, SignType } from "@unipasswallet/keys";
import { MpcSignerOptions } from "../interface";
import { MpcStorage } from "./mpcStorage";
import { decryptKeystore, encryptKeystore } from "@unipasswallet/utils";
import * as crossFetch from "cross-fetch";
import {
  SmartAccountError,
  SmartAccountErrorCode,
  DEFAULT_MASTER_KEY_ROLE_WEIGHT,
  Environment,
  getUnipassServerInfo,
  TssKey,
  UnipassClient,
  Fetch,
  UnipassKeyType,
  Web3AuthSig,
} from "@unipasswallet/smart-account";
import { getWeb3AuthPrivateKey } from "../utils";
import { worker } from "./workerProvider";

export class MpcSigner extends Signer {
  private readonly storage?: MpcStorage;

  private address: string;

  private idToken?: string;

  private appId: string;

  private fetch: Fetch;

  private userKey: string;

  private authorization: string;

  private unipassClient: UnipassClient;

  private authExpirationInterval: string;

  private env: Environment;

  readonly provider?: providers.Provider;

  public readonly _isMpcSigner: boolean;

  constructor(options: MpcSignerOptions) {
    super();

    const {
      storage,
      idToken,
      appId,
      fetch = crossFetch.fetch,
      env = Environment.Production,
      expirationInterval = "30d",
    } = options;
    this.storage = new MpcStorage(storage);
    this.idToken = idToken;
    this.appId = appId;
    this.fetch = fetch;
    this.env = env;
    this.authExpirationInterval = expirationInterval;
    defineReadOnly(this, "_isMpcSigner", true);
  }

  static isMpcSigner(value: any): value is MpcSigner {
    return !!(value && value._isMpcSigner);
  }

  async init(): Promise<MpcSigner> {
    if (this.storage) {
      const signer = await this.initByStorage();
      if (signer) {
        return signer;
      }
    }

    const signer = await this.initByIdToken();
    if (signer) {
      return signer;
    }

    const error = {
      code: SmartAccountErrorCode.BadParams,
      data: undefined,
      message: "Expected Id Token or Valid Storage",
    } as SmartAccountError<undefined>;
    throw error;
  }

  private async initByStorage(): Promise<MpcSigner | undefined> {
    const mpcInfo = await this.storage?.getMpcSignerInfo();
    if (!mpcInfo) {
      return undefined;
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

    const { unipassServerUrl: mpcServerUrl } = getUnipassServerInfo(this.env);

    this.unipassClient = new UnipassClient(mpcServerUrl, fetch);
    this.userKey = userKey;
    this.authorization = authorization;
    this.address = address;

    return this;
  }

  private async initByIdToken(): Promise<MpcSigner | undefined> {
    if (this.idToken) {
      const { unipassServerUrl: mpcServerUrl, chainId, env, rpcUrl: nodeUrl } = getUnipassServerInfo(this.env);
      const mpcClient = new UnipassClient(mpcServerUrl, fetch);

      const {
        web3authConfig: { clientId, verifierName },
        jwtVerifierIdKey,
      } = await mpcClient.config(this.appId, chainId);
      const web3AuthPrivateKey = await getWeb3AuthPrivateKey(
        clientId,
        this.idToken,
        verifierName,
        jwtVerifierIdKey,
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

      const web3AuthSig = await MpcSigner.getIdTokenWeb3AuthSig(this.idToken, web3AuthPrivateKey);

      const { isRegistered, authorization, unipassInfo } = await mpcClient.login(
        this.appId,
        web3AuthSig,
        this.authExpirationInterval,
      );
      if (isRegistered && unipassInfo) {
        const { keyset, keystore } = unipassInfo;
        const userKey = await decryptKeystore(keystore, web3AuthPrivateKey);
        this.unipassClient = new UnipassClient(mpcServerUrl, fetch);
        this.userKey = userKey;
        this.authorization = authorization;
        this.address = (Keyset.fromJson(keyset).keys[0] as KeySecp256k1).address;
      } else {
        const { tssKeyAddress, userKeySignContext } = await tssGenerateKey(authorization, mpcClient);
        const keystore = await encryptKeystore(toUtf8Bytes(userKeySignContext), web3AuthPrivateKey, {
          scrypt: { N: 16 },
        });
        const masterKey = new KeySecp256k1(tssKeyAddress, DEFAULT_MASTER_KEY_ROLE_WEIGHT, SignType.EthSign);
        const keyset = new Keyset([masterKey]);

        const { authorization: registerAuthorization } = await mpcClient.register({
          keysetJson: keyset.toJson(),
          masterKey: {
            masterKeyAddress: tssKeyAddress,
            keystore,
            keyType: UnipassKeyType.ToBusiness,
          },
          web3Auth: web3AuthSig,
          appId: this.appId,
        });
        this.unipassClient = new UnipassClient(mpcServerUrl, fetch);
        this.userKey = userKeySignContext;
        this.authorization = registerAuthorization;
        this.address = masterKey.address;
      }
      this.storage?.updateMpcSignerInfo({
        userKey: this.userKey,
        authorization: this.authorization,
        runningEnv: this.env,
        address: this.address,
      });
      return this;
    }
    return undefined;
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

  connect(provider: Provider): MpcSigner {
    defineReadOnly(this, "provider", provider);
    return this;
  }

  async signMessage(message: Bytes | string): Promise<string> {
    throw new Error("Unsupported");
  }

  async getAddress(): Promise<string> {
    return this.address;
  }

  async signTransaction(transaction: Deferrable<TransactionRequest>): Promise<string> {
    throw new Error("Unsupported");
  }
}

async function tssGenerateKey(authorization: string, unipassClient: UnipassClient): Promise<TssKey> {
  const { tssRes } = await unipassClient.tssKeyGenStart(authorization);
  const [context2, p2FirstMsg] = await worker.li17_p2_key_gen1(tssRes.msg);
  const tssKeyGenParams = {
    sessionId: tssRes.sessionId,
    tssMsg: p2FirstMsg,
  };
  const { tssRes: tssKeyGenRes } = await unipassClient.tssKeyGen(authorization, tssKeyGenParams);
  const [signContext2, pubkey] = await worker.li17_p2_key_gen2(context2, tssKeyGenRes.msg);
  const tssKeyAddress = computeAddress(pubkey.point);
  const tssKeyGenFinishParams = {
    userId: tssRes.userId,
    sessionId: tssRes.sessionId,
    tssKeyAddress,
  };
  await unipassClient.tssKeyGenFinish(authorization, tssKeyGenFinishParams);

  return {
    tssKeyAddress,
    userId: tssRes.userId,
    userKeySignContext: JSON.stringify(signContext2),
  };
}
