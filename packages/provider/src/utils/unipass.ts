import { providers, Wallet as WalletEOA } from "ethers";
import { Wallet } from "@unipasswallet/wallet";
import { Keyset } from "@unipasswallet/keys";
import { RpcRelayer, LocalRelayer } from "@unipasswallet/relayer";
import { AuthChainNode, ChainType, Environment, UnipassWalletProps } from "../interface/unipassWalletProvider";
import { unipassWalletContext } from "@unipasswallet/network";
import { chain_config, api_config, testnet_api_config } from "../config/index";
import { User } from "../interface";
import { decryptSessionKey } from "./session-key";
import { signMsg } from "./cloud-key";
import { SIG_PREFIX } from "./tss";

const genProviders = (config: UnipassWalletProps) => {
  let polygon_url = "";
  let bsc_url = "";
  let rangers_url = "";
  switch (config.env) {
    case "testnet":
      polygon_url = chain_config["polygon-mumbai"].rpc_url;
      bsc_url = chain_config["bsc-testnet"].rpc_url;
      rangers_url = chain_config["rangers-robin"].rpc_url;
      break;
    case "mainnet":
      polygon_url = chain_config["polygon-mainnet"].rpc_url;
      bsc_url = chain_config["bsc-mainnet"].rpc_url;
      rangers_url = chain_config["rangers-mainnet"].rpc_url;
      break;
    default:
      polygon_url = chain_config["polygon-mainnet"].rpc_url;
      bsc_url = chain_config["bsc-mainnet"].rpc_url;
      rangers_url = chain_config["rangers-mainnet"].rpc_url;
  }
  const polygon = new providers.JsonRpcProvider(polygon_url);
  const bsc = new providers.JsonRpcProvider(bsc_url);
  const rangers = new providers.JsonRpcProvider(rangers_url);
  return { polygon, bsc, rangers };
};

const genRelayers = (
  config: UnipassWalletProps,
  polygonProvider: providers.JsonRpcProvider,
  bcdProvider: providers.JsonRpcProvider,
  rangersProvider: providers.JsonRpcProvider,
) => {
  let relayer_config: { bsc: string; polygon: string; rangers: string };
  switch (config.env) {
    case "testnet":
      relayer_config = {
        bsc: testnet_api_config.relayer.bsc,
        rangers: testnet_api_config.relayer.rangers,
        polygon: testnet_api_config.relayer.polygon,
      };
      break;
    case "mainnet":
      relayer_config = {
        bsc: api_config.relayer.bsc,
        rangers: api_config.relayer.rangers,
        polygon: api_config.relayer.polygon,
      };
      break;
    default:
      relayer_config = {
        bsc: api_config.relayer.bsc,
        rangers: api_config.relayer.rangers,
        polygon: api_config.relayer.polygon,
      };
  }
  relayer_config = config?.url_config?.relayer || relayer_config;

  const polygon = new RpcRelayer(relayer_config.polygon, unipassWalletContext, polygonProvider);
  const bsc = new RpcRelayer(relayer_config.bsc, unipassWalletContext, bcdProvider);
  const rangers = new RpcRelayer(relayer_config.rangers, unipassWalletContext, rangersProvider);

  return { polygon, bsc, rangers };
};
export class WalletsCreator {
  public static instance: WalletsCreator;

  public polygon: Wallet;

  public bsc: Wallet;

  public rangers: Wallet;

  static getInstance(keyset: Keyset, address: string, config: UnipassWalletProps) {
    if (!WalletsCreator.instance) {
      const ins = new WalletsCreator(keyset, address, config);
      WalletsCreator.instance = ins;
    }
    WalletsCreator.instance.polygon.address = address;
    WalletsCreator.instance.polygon.keyset = keyset;

    WalletsCreator.instance.bsc.address = address;
    WalletsCreator.instance.bsc.keyset = keyset;

    WalletsCreator.instance.rangers.address = address;
    WalletsCreator.instance.rangers.keyset = keyset;
    return WalletsCreator.instance;
  }

  private constructor(keyset: Keyset, address: string, config: UnipassWalletProps) {
    const { polygon: polygonProvider, bsc: bscProvider, rangers: rangersProvider } = genProviders(config);
    const {
      polygon: polygonRelayer,
      bsc: bscRelayer,
      rangers: rangersRelayer,
    } = genRelayers(config, polygonProvider, bscProvider, rangersProvider);
    this.polygon = Wallet.create({
      keyset,
      provider: polygonProvider,
      relayer: polygonRelayer,
      address,
    });
    this.bsc = Wallet.create({ address, keyset, provider: bscProvider, relayer: bscRelayer });
    this.rangers = Wallet.create({
      keyset,
      provider: rangersProvider,
      relayer: rangersRelayer,
      address,
    });
  }

  static getPolygonProvider(keyset: Keyset, env: Environment): Wallet {
    let polygon_url = "";
    switch (env) {
      case "testnet":
        polygon_url = chain_config["polygon-mumbai"].rpc_url;
        break;
      case "mainnet":
        polygon_url = chain_config["polygon-mainnet"].rpc_url;
        break;
      default:
        polygon_url = chain_config["polygon-mainnet"].rpc_url;
    }
    return Wallet.create({
      keyset,
      provider: new providers.JsonRpcProvider(polygon_url),
    });
  }
}

export const getAuthNodeChain = (env: Environment, chainType: ChainType): AuthChainNode => {
  if (env === "testnet") {
    switch (chainType) {
      case "polygon":
        return "polygon-mumbai";
      case "bsc":
        return "bsc-testnet";
      case "rangers":
        return "rangers-robin";
      default:
        return "polygon-mumbai";
    }
  } else if (env === "mainnet") {
    switch (chainType) {
      case "polygon":
        return "polygon-mainnet";
      case "bsc":
        return "bsc-mainnet";
      case "rangers":
        return "rangers-mainnet";
      default:
        return "polygon-mainnet";
    }
  }
};

export const genSessionKeyPermit = async (user: User, prefix: keyof typeof SIG_PREFIX) => {
  const timestamp = user.sessionKey.expires;
  const sessionKeyAddress = user.sessionKey.localKey.address;
  const permit = user.sessionKey.authorization;
  const sessionKeyPrivateKey = await decryptSessionKey(user.sessionKey.aesKey, user.sessionKey.localKey.keystore);
  const sig = await signMsg(SIG_PREFIX[prefix] + timestamp, sessionKeyPrivateKey, false);

  const sessionKeyPermit = {
    timestamp,
    timestampNow: timestamp,
    permit,
    sessionKeyAddress,
    sig,
    weight: 100,
  };
  return sessionKeyPermit;
};
