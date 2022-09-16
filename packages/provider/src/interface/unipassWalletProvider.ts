import { BigNumber, BytesLike, providers } from "ethers";
import type { ConnectionInfo } from "ethers/src.ts/utils";

type ChainName =
  | "polygon-mainnet"
  | "bsc-mainnet"
  | "rangers-mainnet"
  | "polygon-mumbai"
  | "bsc-testnet"
  | "rangers-robin";

type Environment = "dev" | "test" | "prod";

interface UnipassWalletProps {
  env: Environment;
  chainName?: ChainName;
  url?: ConnectionInfo | string;
  network?: providers.Networkish;
}

interface UniTransaction {
  revertOnError?: boolean;
  gasLimit?: BigNumber;
  target: BytesLike;
  value: BigNumber;
  data?: BytesLike;
}

abstract class WalletProvider {}

export { ChainName, Environment, UnipassWalletProps, WalletProvider, UniTransaction };
