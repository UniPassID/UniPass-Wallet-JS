import { BigNumber } from "ethers";
import { PendingExecuteCallArgs, SimulateExecute, SimulateKey, SimulateResult, TxnReceiptResult } from "./rpcRelayer";

export * from "./rpcRelayer";

export * from "./localRelayer";

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
  amount: string;
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
  simulate(target: string, keyset: SimulateKey[], execute: SimulateExecute, token?: string): Promise<SimulateResult>;

  getNonce(walletAddr: string): Promise<BigNumber>;

  getMetaNonce(walletAddr: string): Promise<BigNumber>;

  relay(args: PendingExecuteCallArgs): Promise<string>;

  wait(txHash: string): Promise<TxnReceiptResult>;
}
