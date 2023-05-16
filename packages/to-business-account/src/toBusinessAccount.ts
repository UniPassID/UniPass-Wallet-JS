import { providers } from "ethers";
import { UnipassToBusinessStorage } from "./toBusinessStorage";
import fetchPonyfill from "fetch-ponyfill";
import { base64, getCreate2Address, keccak256, solidityPack } from "ethers/lib/utils";
import { KeySecp256k1, Keyset, RoleWeight, SignType } from "@unipasswallet/keys";
import { CreationCode, SingletonFactoryAddress, decryptKeystore, encryptKeystore } from "@unipasswallet/utils";
import { Web3Auth } from "@web3auth/single-factor-auth";
import { MAINNET_UNIPASS_WALLET_CONTEXT } from "@unipasswallet/network";
import {
  UnipassToBusinessAccountOptions,
  UnipassToBusinessConnectByEOAWallet,
  UnipassToBusinessConnectByOAuth,
  UnipassToBusinessConnectParams,
  UnipassToBusinessEOAAccount,
  UnipassToBusinessLocalConnectParams,
  UnipassToBusinessOpenIDAccount as UnipassToBusinessOAuthAccount,
} from "./interface/smartAccount";
import { UnipassKeyType, UnipassRunningEnv } from "./interface/unipassClient";
import { UnipassToBusinessClient } from "./toBusinessClient";
import { UnipassToBusinessError, UnipassToBusinessResCode } from "./interface/utils";

export class UnipassToBusinessAccount {
  public readonly walletAddress: string;

  public readonly keyset: Keyset;

  public readonly masterKeyIndex: number;

  public readonly accountType: UnipassToBusinessOAuthAccount | UnipassToBusinessEOAAccount;

  public readonly provider: providers.JsonRpcProvider;

  public readonly storage: UnipassToBusinessStorage;

  constructor(options: UnipassToBusinessAccountOptions) {
    const { walletAddress, keyset, accountType, masterKeyIndex = 0, provider } = options;
    this.walletAddress = walletAddress;
    this.keyset = keyset;
    this.accountType = accountType;
    this.masterKeyIndex = masterKeyIndex;
    this.provider = provider;
  }

  private static getAuthorizationExpires(authorization: string): number | undefined {
    const payload = authorization.split(".")[1];
    if (payload) {
      const decodedPayload = JSON.parse(base64.decode(payload).toString());
      return decodedPayload.exp;
    }
    return undefined;
  }

  private static getIdTokenSub(idToken: string): string | undefined {
    const payload = idToken.split(".")[1];
    if (payload) {
      const decodedPayload = JSON.parse(base64.decode(payload).toString());
      return decodedPayload.sub;
    }
    return undefined;
  }

  private static async localConnect(
    options: UnipassToBusinessLocalConnectParams,
  ): Promise<UnipassToBusinessAccount | undefined> {
    const { storage, fetch = fetchPonyfill().fetch } = options;
    const walletIdentity = await storage.getCurrentWalletIdentity();
    if (walletIdentity) {
      const { address: walletAddress, chainId } = walletIdentity;
      const walletInfo = await storage.getWalletInfo(walletAddress, chainId);
      if (walletInfo) {
        const { authorization, keyset: keysetJson, unipassServerUrl, userKey, rpcUrl, unipassRelayerUrl } = walletInfo;
        const expires = UnipassToBusinessAccount.getAuthorizationExpires(authorization);
        if (expires && expires > new Date().getTime() / 1000) {
          const unipassClient = new UnipassToBusinessClient(unipassServerUrl, fetch);
          const keyset = Keyset.fromJson(keysetJson);
          const provider = new providers.StaticJsonRpcProvider(rpcUrl);
          return new UnipassToBusinessAccount({
            walletAddress,
            keyset,
            accountType: {
              authorization,
              unipassClient,
              userKey,
              unipassRelayerUrl,
            },
            storage,
            provider,
          });
        }
      }
    }
    return undefined;
  }

  private static async getWeb3AuthPrivateKey(
    clientId: string,
    idToken: string,
    verifier: string,
    verifierId: string,
  ): Promise<string | undefined> {
    const web3Auth = new Web3Auth({
      clientId,
      chainConfig: { chainNamespace: "eip155" },
    });
    web3Auth.init();
    const provider = await web3Auth.connect({ verifier, idToken, verifierId });
    if (provider) {
      const privateKey = await provider.request<string>({ method: "eth_private_key" });
      if (privateKey) {
        return privateKey;
      }
    }
    return undefined;
  }

  public static async connect(
    params: UnipassToBusinessConnectParams | UnipassToBusinessLocalConnectParams,
  ): Promise<UnipassToBusinessAccount | undefined> {
    if ("appId" in params) {
      const { connectParams, appId, rpcUrl, storage } = params;
      const provider = new providers.StaticJsonRpcProvider(rpcUrl);
      let account: UnipassToBusinessAccount;
      if ("signer" in connectParams) {
        account = await UnipassToBusinessAccount.connectToBuninessAccountByEOA(connectParams, storage, provider);
      } else {
        account = await UnipassToBusinessAccount.connectToBusinessAccountByOpenID(
          connectParams,
          provider,
          appId,
          storage,
        );
      }

      await account.store();
      return account;
    } else {
      return this.localConnect(params);
    }
  }

  private static async connectToBusinessAccountByOpenID(
    connectParams: UnipassToBusinessConnectByOAuth,
    provider: providers.StaticJsonRpcProvider,
    appId: string,
    storage: UnipassToBusinessStorage,
  ): Promise<UnipassToBusinessAccount> {
    const { idToken, accessToken, fetch = fetchPonyfill().fetch, source, runningEnv } = connectParams;

    const verifierId = UnipassToBusinessAccount.getIdTokenSub(idToken);
    if (!verifierId) {
      const error = {
        code: UnipassToBusinessResCode.InvalidIdToken,
        data: undefined,
        message: "Invalid Id Token",
      } as UnipassToBusinessError<undefined>;

      throw error;
    }
    const unipassServerUrl = getUnipassServerUrl(runningEnv);
    const unipassClient = new UnipassToBusinessClient(unipassServerUrl, fetch);

    const [{ isRegistered, authorization, unipassInfo }, { chainId }] = await Promise.all([
      unipassClient.login(accessToken, source),
      provider.getNetwork(),
    ]);

    const {
      web3authConfig: { clientId, verifierName },
      unipassRelayerUrl,
    } = await unipassClient.config(authorization, appId, chainId);
    const web3AuthPrivateKey = await UnipassToBusinessAccount.getWeb3AuthPrivateKey(
      clientId,
      idToken,
      verifierName,
      verifierId,
    );

    if (!web3AuthPrivateKey) {
      const error = {
        code: UnipassToBusinessResCode.Web3AuthLoginFailed,
        message: "Web3Auth Login Failed",
        data: undefined,
      } as UnipassToBusinessError<undefined>;
      throw error;
    }

    if (isRegistered && unipassInfo) {
      const { keyset, address, keystore } = unipassInfo;
      const userKey = await decryptKeystore(keystore, web3AuthPrivateKey);
      return new UnipassToBusinessAccount({
        keyset: Keyset.fromJson(keyset),
        walletAddress: address,
        accountType: {
          authorization,
          unipassClient,
          userKey,
          unipassRelayerUrl,
        },
        storage,
        provider,
      });
    } else {
      const { tssKeyAddress, userKeySignContext } = await unipassClient.tssGenerateKey(authorization);
      const keystore = await encryptKeystore(userKeySignContext, web3AuthPrivateKey, {
        scrypt: { N: 16 },
      });
      const masterKey = new KeySecp256k1(tssKeyAddress, new RoleWeight(100, 100, 100), SignType.EthSign);
      const keyset = new Keyset([masterKey]);
      const walletAddress = getCreate2Address(
        SingletonFactoryAddress,
        keyset.hash(),
        keccak256(solidityPack(["bytes", "uint256"], [CreationCode, MAINNET_UNIPASS_WALLET_CONTEXT.moduleMain])),
      );
      await unipassClient.register({
        keysetJson: keyset.toJson(),
        masterKey: {
          masterKeyAddress: tssKeyAddress,
          keystore,
          keyType: UnipassKeyType.ToBusiness,
        },
      });
      return new UnipassToBusinessAccount({
        keyset,
        walletAddress,
        accountType: {
          authorization,
          unipassClient,
          userKey: userKeySignContext,
          unipassRelayerUrl,
        },
        storage,
        provider,
      });
    }
  }

  public static async connectToBuninessAccountByEOA(
    connectParams: UnipassToBusinessConnectByEOAWallet,
    storage: UnipassToBusinessStorage,
    provider: providers.StaticJsonRpcProvider,
  ): Promise<UnipassToBusinessAccount> {
    const { signer } = connectParams;
    const masterKey = new KeySecp256k1(await signer.getAddress(), new RoleWeight(100, 100, 100), SignType.EthSign);
    const keyset = new Keyset([masterKey]);
    const walletAddress = getCreate2Address(
      SingletonFactoryAddress,
      keyset.hash(),
      keccak256(solidityPack(["bytes", "uint256"], [CreationCode, MAINNET_UNIPASS_WALLET_CONTEXT.moduleMain])),
    );

    const account = new UnipassToBusinessAccount({
      keyset,
      walletAddress,
      accountType: {
        signer,
      },
      storage,
      provider,
    });
    return account;
  }

  private async store(): Promise<void> {
    const { chainId } = await this.provider.getNetwork();
    if (!("signer" in this.accountType)) {
      const { userKey, unipassClient, authorization, unipassRelayerUrl } = this.accountType;
      await Promise.all([
        this.storage.updateCurrentWalletIdentity(this.walletAddress, chainId),
        this.storage.updateWalletInfo(this.walletAddress, chainId, {
          keyset: this.keyset.toJson(),
          userKey,
          unipassServerUrl: unipassClient.baseUrl,
          authorization,
          rpcUrl: this.provider.connection.url,
          unipassRelayerUrl,
        }),
      ]);
    } else {
      await this.storage.updateCurrentWalletIdentity(this.walletAddress, chainId);
    }
  }
}

export function getUnipassServerUrl(runningEnv: UnipassRunningEnv): string {
  switch (runningEnv) {
    case UnipassRunningEnv.Dev:
      return "https://d.wallet.unipass.vip/wallet-v2/backend";
    case UnipassRunningEnv.Testnet:
      return "https://t.wallet.unipass.vip/wallet-v2/backend";
    default:
      throw new Error(`Unknown Env: ${runningEnv}`);
  }
}
