import { providers } from "ethers";
import { Wallet } from "@unipasswallet/wallet";
import { Keyset } from "@unipasswallet/keys";
import { RpcRelayer } from "@unipasswallet/relayer";
import { Environment } from "../interface/unipassWalletProvider";
import { unipassWalletContext } from "@unipasswallet/network";
import { chain_config, api_config, test_api_config } from "../config/index";

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
  const polygon = new RpcRelayer(relayer_url, unipassWalletContext, genProviders(env).polygon);
  const bsc = new RpcRelayer(relayer_url, unipassWalletContext, genProviders(env).bsc);
  const rangers = new RpcRelayer(relayer_url, unipassWalletContext, genProviders(env).rangers);
  return { polygon, bsc, rangers };
};

export const genWallets = (keyset: Keyset, env: Environment) => {
  const polygon = Wallet.create({ keyset, provider: genProviders(env).polygon, relayer: genRelayers(env).polygon });
  const bsc = Wallet.create({ keyset, provider: genProviders(env).bsc, relayer: genRelayers(env).bsc });
  const rangers = Wallet.create({ keyset, provider: genProviders(env).rangers, relayer: genRelayers(env).rangers });
  return { polygon, bsc, rangers };
};
