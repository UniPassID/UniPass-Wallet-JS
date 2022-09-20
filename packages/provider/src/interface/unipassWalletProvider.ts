import { Wallet } from "@unipasswallet/wallet";
import { BigNumber, BytesLike, providers } from "ethers";

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

  public abstract transaction(props: TransactionProps): Promise<providers.TransactionReceipt>;

  public abstract signMessage(message: string): Promise<string>;

  public abstract wallet(chain: ChainType): Promise<Wallet>;

  /**
   * isLoggedIn
   */
  public abstract isLoggedIn(): Promise<boolean>;

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
