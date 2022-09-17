import { BigNumber, BytesLike } from "ethers";

type AuthChainNode =
  | "polygon-mumbai"
  | "bsc-testnet"
  | "rangers-robin"
  | "polygon-mainnet"
  | "bsc-mainnet"
  | "rangers-mainnet";

type Environment = "dev" | "test" | "prod";

type ChainType = "polygon" | "bsc" | "rangers";

interface UnipassWalletProps {
  env: Environment;
}

interface UniTransaction {
  revertOnError?: boolean;
  gasLimit?: BigNumber;
  target: BytesLike;
  value: BigNumber;
  data?: BytesLike;
}

interface TransactionFee {
  value: BigNumber;
  token: string;
}

abstract class WalletProvider {}

export { ChainType, Environment, AuthChainNode, UnipassWalletProps, WalletProvider, UniTransaction, TransactionFee };
