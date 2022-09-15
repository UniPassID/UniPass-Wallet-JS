import { providers } from "ethers";
import type { ConnectionInfo } from "ethers/src.ts/utils";

type NodeName =
  | "polygon-mainnet"
  | "bsc-mainnet"
  | "rangers-mainnet"
  | "polygon-mumbai"
  | "bsc-testnet"
  | "rangers-robin";

type Environment = "dev" | "test" | "prod";

interface UnipassWalletProps {
  env: Environment;
  chainName?: NodeName;
  url?: ConnectionInfo | string;
  network?: providers.Networkish;
}

abstract class WalletProvider {}

export { NodeName, Environment, UnipassWalletProps, WalletProvider };
