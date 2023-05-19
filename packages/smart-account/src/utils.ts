import { RoleWeight } from "@unipasswallet/keys";
import { Environment } from "./interface";

export const DEFAULT_MASTER_KEY_ROLE_WEIGHT = new RoleWeight(100, 100, 0);

export function getUnipassServerInfo(env: Environment): {
  unipassServerUrl: string;
  chainId: number;
  env: "testnet" | "mainnet";
  rpcUrl: string;
} {
  switch (env) {
    case Environment.Dev:
      return {
        unipassServerUrl: "https://d.wallet.unipass.vip/wallet-v2",
        chainId: 5,
        env: "testnet",
        rpcUrl: "https://node.wallet.unipass.id/eth-goerli",
      };
    case Environment.Testnet:
      return {
        unipassServerUrl: "https://testnet.wallet.unipass.id/wallet-v2",
        chainId: 5,
        env: "testnet",
        rpcUrl: "https://node.wallet.unipass.id/eth-goerli",
      };
    case Environment.Production:
      return {
        unipassServerUrl: "https://wallet.unipass.id/wallet-v2",
        chainId: 1,
        env: "mainnet",
        rpcUrl: "https://node.wallet.unipass.id/eth-mainnet",
      };
    default:
      throw new Error(`Unknown Env: ${env}`);
  }
}
