import { Keyset } from "@unipasswallet/keys";
import { Wallet } from "@unipasswallet/wallet";
import { BigNumber, BytesLike, providers } from "ethers";

type AuthChainNode =
  | "polygon-mumbai"
  | "eth-goerli"
  | "bsc-testnet"
  | "rangers-robin"
  | "polygon-mainnet"
  | "eth-mainnet"
  | "bsc-mainnet"
  | "rangers-mainnet";

type Environment = "testnet" | "mainnet";

type ChainType = "polygon" | "eth" | "bsc" | "rangers";

export type UrlConfig = {
  backend: string;
  relayer: {
    eth: string;
    polygon: string;
    bsc: string;
    rangers: string;
  };
};

interface UnipassWalletProps {
  env: Environment;
  url_config?: UrlConfig;
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

interface TransactionProps {
  keyset?: Keyset;
  tx: UniTransaction;
  fee?: TransactionFee;
  chain?: ChainType;
  timeout?: number;
  gasLimit?: BigNumber;
}

abstract class WalletProvider {
  private constructor() {}

  /**
   * send a transaction
   * @params props: TransactionProps
   * * */
  public abstract transaction(props: TransactionProps): Promise<providers.TransactionReceipt>;

  /**
   * signMessage
   * @params message: string
   * * */
  public abstract signMessage(message: string): Promise<string>;

  /**
   * verifySignMessage
   * @params message: string
   * * */
  public abstract verifySignMessage(message: string, signature: string): Promise<boolean>;

  /**
   * get wallet instance
   * @params chain: ChainType
   * * */
  public abstract wallet(chain: ChainType): Promise<Wallet>;
}

export {
  ChainType,
  Environment,
  AuthChainNode,
  UnipassWalletProps,
  WalletProvider,
  UniTransaction,
  TransactionFee,
  TransactionProps,
};
