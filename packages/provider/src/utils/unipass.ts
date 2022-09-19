import { providers, Wallet as WalletEOA } from "ethers";
import { Wallet } from "@unipasswallet/wallet";
import { Keyset } from "@unipasswallet/keys";
import { RpcRelayer, LocalRelayer } from "@unipasswallet/relayer";
import { AuthChainNode, ChainType, Environment } from "../interface/unipassWalletProvider";
import { unipassWalletContext } from "@unipasswallet/network";
import { chain_config, api_config, test_api_config } from "../config/index";
import { User } from "../interface";
import { decryptSessionKey } from "./session-key";
import { signMsg } from "./cloud-key";
import { SIG_PREFIX } from "./tss";

export const genProviders = (env: Environment) => {
  let polygon_url = "";
  let bsc_url = "";
  let rangers_url = "";
  switch (env) {
    case "dev":
    case "test":
      polygon_url = chain_config["polygon-mumbai"].rpc_url;
      bsc_url = chain_config["bsc-testnet"].rpc_url;
      rangers_url = chain_config["rangers-robin"].rpc_url;
      break;
    case "prod":
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

export const genRelayers = (env: Environment) => {
  let relayer_url = "";
  switch (env) {
    case "dev":
    case "test":
      relayer_url = test_api_config.relayer;
      break;
    case "prod":
      relayer_url = api_config.relayer;
      break;
    default:
      relayer_url = api_config.relayer;
  }
  // const polygon = new RpcRelayer(relayer_url, unipassWalletContext, genProviders(env).polygon);
  // const bsc = new RpcRelayer(relayer_url, unipassWalletContext, genProviders(env).bsc);
  // const rangers = new RpcRelayer(relayer_url, unipassWalletContext, genProviders(env).rangers);

  const polygonwallet = new WalletEOA(
    "9c7b4c1f29a493d29cc3dac7c64dcf027faa6fa07b730adb95d43a19b992da54",
    genProviders(env).polygon,
  );
  const bscwallet = new WalletEOA(
    "9c7b4c1f29a493d29cc3dac7c64dcf027faa6fa07b730adb95d43a19b992da54",
    genProviders(env).bsc,
  );
  const rangerswallet = new WalletEOA(
    "9c7b4c1f29a493d29cc3dac7c64dcf027faa6fa07b730adb95d43a19b992da54",
    genProviders(env).rangers,
  );
  const polygon = new LocalRelayer(unipassWalletContext, polygonwallet);
  const bsc = new LocalRelayer(unipassWalletContext, bscwallet);
  const rangers = new LocalRelayer(unipassWalletContext, rangerswallet);
  return { polygon, bsc, rangers };
};

export const genWallets = (keyset: Keyset, env: Environment, address?: string) => {
  const polygon = Wallet.create({
    keyset,
    provider: genProviders(env).polygon,
    relayer: genRelayers(env).polygon,
    address,
  });
  const bsc = Wallet.create({ keyset, provider: genProviders(env).bsc, relayer: genRelayers(env).bsc, address });
  const rangers = Wallet.create({
    keyset,
    provider: genProviders(env).rangers,
    relayer: genRelayers(env).rangers,
    address,
  });
  return { polygon, bsc, rangers };
};

export const getAuthNodeChain = (env: Environment, chainType: ChainType): AuthChainNode => {
  if (env === "dev" || env === "test") {
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
  } else if (env === "prod") {
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
