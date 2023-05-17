import { RoleWeight } from "@unipasswallet/keys";
import { MpcRunningEnv } from "./interface";

export function getMpcServerUrl(runningEnv: MpcRunningEnv): string {
  switch (runningEnv) {
    case MpcRunningEnv.Dev:
      return "https://d.wallet.unipass.vip/wallet-v2";
    case MpcRunningEnv.Testnet:
      return "https://t.wallet.unipass.vip/wallet-v2";
    default:
      throw new Error(`Unknown Env: ${runningEnv}`);
  }
}

export const DEFAULT_MASTER_KEY_ROLE_WEIGHT = new RoleWeight(100,100,0);