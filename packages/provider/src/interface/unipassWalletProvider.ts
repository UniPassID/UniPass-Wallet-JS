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
  tx: UniTransaction;
  fee?: TransactionFee;
  chain?: ChainType;
}

abstract class WalletProvider {
  private constructor() {}

  /**
   * get email verify code when registry
   * @params email
   * * */
  public abstract registerCode(email: string): Promise<void | never>;

  /**
   * verify your code when register
   * @params code
   * * */
  public abstract verifyRegisterCode(code: string): Promise<void | never>;

  /**
   * register
   * @params password
   * * */
  public abstract register(password: string): Promise<void | never>;

  /**
   * check password
   * @params password
   * * */
  public abstract passwordToken(email: string, password: string): Promise<void | never>;

  /**
   * get email verify code when login
   * @params email
   * * */
  public abstract loginCode(email: string): Promise<void | never>;

  /**
   * login
   * @params login
   * * */
  public abstract login(code: string): Promise<void | never>;

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

  /**
   * isLoggedIn
   */
  public abstract isLoggedIn(): Promise<boolean>;

  /**
   * logout
   */
  public abstract logout(): Promise<void | never>;
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
