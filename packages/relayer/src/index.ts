import { BigNumber } from "ethers";
import { Transaction } from "@unipasswallet/transactions";
import { PendingExecuteCallArgs, TxnReciptResult } from "./rpcRelayer";

export * from "./rpcRelayer";

export * from "./localRelayer";

export interface SimulateResult {
  executed: boolean;
  succeeded: boolean;
  result?: string;
  reason?: string;
  gasUsed: number;
  gasLimit: number;
}

export enum TransferType {
  SEND = "SEND",
  RECEIVE = "RECEIVE",
  BRIDGE_DEPOSIT = "BRIDGE_DEPOSIT",
  BRIDGE_WITHDRAW = "BRIDGE_WITHDRAW",
  BURN = "BURN",
  UNKNOWN = "UNKNOWN",
}

export interface FeeOption {
  token: FeeToken;
  to: string;
  value: string;
  gasLimit: number;
}

export interface FeeToken {
  chainId: number;
  name: string;
  symbol: string;
  tokenType: FeeTokenType;
  decimals: number;
  logoUrl: string;
  contractAddress?: string;
}

export enum FeeTokenType {
  Native = "Native",
  ERC20Token = "ERC20Token",
}

export interface TxnLogTransfer {
  transferType: TransferType;
  contractAddress: string;
  from: string;
  to: string;
  ids: Array<string>;
  amounts: Array<string>;
}

export interface Relayer {
  // simulate(...transactions: Transaction[]): Promise<SimulateResult[]>;

  // estimateGasLimits(...transactions: Transaction[]): Promise<Transaction[]>;

  getFeeOptions(gasLimit?: string): Promise<{ options: FeeOption[] | Array<Pick<FeeOption, "to">> }>;

  // gasRefundOptions(...transactions: Transaction[]): Promise<FeeOption[]>;

  getNonce(walletAddr: string): Promise<BigNumber>;

  getMetaNonce(walletAddr: string): Promise<BigNumber>;

  relay(args: PendingExecuteCallArgs): Promise<string>;

  wait(txHash: string): Promise<TxnReciptResult | undefined>;
}
