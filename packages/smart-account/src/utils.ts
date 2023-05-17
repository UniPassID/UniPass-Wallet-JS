import { RoleWeight } from "@unipasswallet/keys";
import { MpcRunningEnv } from "./interface";

export function getMpcServerInfo(runningEnv: MpcRunningEnv): {
  mpcServerUrl: string;
  chainId: number;
  env: "testnet" | "mainnet";
  nodeUrl: string;
} {
  switch (runningEnv) {
    case MpcRunningEnv.Dev:
      return {
        mpcServerUrl: "https://d.wallet.unipass.vip/wallet-v2",
        chainId: 5,
        env: "testnet",
        nodeUrl: "https://node.wallet.unipass.id/eth-goerli",
      };
    case MpcRunningEnv.Testnet:
      return {
        mpcServerUrl: "https://t.wallet.unipass.vip/wallet-v2",
        chainId: 5,
        env: "testnet",
        nodeUrl: "https://node.wallet.unipass.id/eth-goerli",
      };
    default:
      throw new Error(`Unknown Env: ${runningEnv}`);
  }
}

export const DEFAULT_MASTER_KEY_ROLE_WEIGHT = new RoleWeight(100, 100, 0);
