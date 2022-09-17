import { BigNumber, BytesLike } from "ethers";

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

abstract class WalletProvider {}

export { ChainType, Environment, UnipassWalletProps, WalletProvider, UniTransaction };
