import { Keyset } from "@unipasswallet/keys";
import { Wallet } from "@unipasswallet/wallet";
import { FeeActionPointSig } from "@unipasswallet/relayer";
import { BigNumber, BytesLike, providers } from "ethers";
import { AccountInfo } from "./index";

type AuthChainNode =
  | "polygon-mumbai"
  | "eth-goerli"
  | "bsc-testnet"
  | "rangers-robin"
  | "scroll-testnet"
  | "arbitrum-testnet"
  | "avalanche-testnet"
  | "kcc-testnet"
  | "okc-testnet"
  | "platon-testnet"
  | "polygon-mainnet"
  | "eth-mainnet"
  | "bsc-mainnet"
  | "rangers-mainnet"
  | "arbitrum-mainnet"
  | "avalanche-mainnet"
  | "kcc-mainnet"
  | "okc-mainnet"
  | "platon-mainnet";

type Environment = "testnet" | "mainnet";

type ChainType = "polygon" | "eth" | "bsc" | "rangers" | "scroll" | "arbitrum" | "avalanche" | "kcc" | "okc" | "platon";

export type UrlConfig = {
  backend: string;
  relayer: {
    eth: string;
    polygon: string;
    bsc: string;
    rangers: string;
    arbitrum: string;
    kcc: string;
    avalanche: string;
    okc: string;
    platon: string;
  };
};

interface UnipassWalletProps {
  env: Environment;
  url_config?: UrlConfig;
  accountInfo?: AccountInfo;
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
  receiver: string;
}

interface TransactionProps {
  keyset?: Keyset;
  tx?: UniTransaction;
  fee?: TransactionFee;
  chain?: ChainType;
  timeout?: number;
  gasLimit?: BigNumber;
  isAddHook?: boolean;
  feeActionPointSig?: FeeActionPointSig;
}

abstract class WalletProvider {
  private constructor() {}

  /**
   * send a transaction
   * @params props: TransactionProps
   * * */
  public abstract transaction(props: TransactionProps): Promise<providers.TransactionResponse>;

  /**
   * signMessage
   * @params message: string
   * * */
  public abstract signMessage(message: string, keyset: Keyset): Promise<string>;

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
