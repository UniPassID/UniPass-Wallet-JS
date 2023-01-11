import { FeeToken, FeeOption } from "..";
import { CallType, Transactionish, toTransaction, toTransactions } from "@unipasswallet/transactions";
import { KeyType } from "@unipasswallet/keys";
import { BigNumber, providers } from "ethers";
import { hexlify } from "ethers/lib/utils";
import {} from "ethers";

const CONTRACT_NOT_DEPLOYED_CODE = 1002;
export interface FeeTokensReturn {
  isFeeRequired: boolean;
  tokens: FeeToken[];
}

export interface FeeOptionArgs {
  gasLimit: string;
}

export interface FeeOptionsReturn {
  currentGasPrice: string;
  options: FeeOption[];
}

export interface UnipassTransaction {
  callType: CallType;
  revertOnError: boolean;
  target: string;
  gasLimit: string;
  value: string;
  data: string;
}

export function toUnipassTransaction(tx: Transactionish): UnipassTransaction {
  const transaction = toTransaction(tx);
  return {
    ...transaction,
    target: hexlify(transaction.target),
    gasLimit: transaction.gasLimit.toHexString(),
    value: transaction.value.toHexString(),
    data: hexlify(transaction.data),
  };
}

export function toUnipassTransactions(tx: Transactionish | Transactionish[]): UnipassTransaction[] {
  const transactions = toTransactions(tx).map((v) => toUnipassTransaction(v));

  return transactions;
}

export interface ExecuteCall {
  txs: UnipassTransaction[];
  nonce: string;
  signature: string;
}

export interface PendingExecuteCallArgs {
  walletAddress: string;
  call: string;
}

export interface TxnReciptLog {
  address: string;
  topics: string[];
  data: string;
}

export interface TxnReceiptResult {
  receipt?: providers.TransactionReceipt;
}

export interface SimulateArgs {
  target: string;
  execute: SimulateExecute;
  keyset: SimulateKey[];
  token?: string;
}

export interface SimulateKey {
  keyType: KeyType;
  ownerRoleWeight: number;
  assetsopRoleWeight: number;
  guardianRoleWeight: number;
}

export interface SimulateExecute {
  txs: (SimulateTransaction | UnipassTransaction)[];
  nonce: string;
  signature: string | number[];
}

export interface SimulateTransaction {
  execute: SimulateExecute;
  target: string;
  revertOnError: boolean;
}

export interface SimulateResult {
  feeTokens: TokenInfo[];
  discount: number;
  feeReceiver: string;
  isFeeRequired: boolean;
  gasPrice: string;
}

export interface TokenInfo {
  token: string;
  gasUsed: string;
  tokenPrice: number;
  nativeTokenPrice: number;
}

export interface RpcService {
  feeTokens(headers?: object): Promise<FeeTokensReturn>;
  feeOptions(feeOptionArgs: FeeOptionArgs, headers?: object): Promise<FeeOptionsReturn>;
  sendTransaction(args: PendingExecuteCallArgs, headers?: object): Promise<string>;
  txRecipt(txHash: string, headers?: object): Promise<TxnReceiptResult>;
  simulate(args: SimulateArgs, headers?: object): Promise<SimulateResult>;
  nonce(walletAddr: string, headers?: object): Promise<BigNumber>;
  metaNonce(walletAddr: string, headers?: object): Promise<BigNumber>;
}

export class RpcService implements RpcService {
  protected hostname: string;

  protected fetch: Fetch;

  constructor(hostname: string, fetch: Fetch) {
    this.hostname = hostname;
    this.fetch = fetch;
  }

  private url(name: string): string {
    return this.hostname + name;
  }

  async feeTokens(headers?: object): Promise<FeeTokensReturn> {
    const res = await this.fetch(this.url("/fee_tokens"), createGetPostHTTPRequest(headers));
    const _data = await buildResponse(res);
    return {
      isFeeRequired: <boolean>_data.isFeeRequired,
      tokens: <FeeToken[]>_data.tokens,
    };
  }

  async feeOptions(feeOptionArgs: FeeOptionArgs, headers?: object): Promise<FeeOptionsReturn> {
    const res = await this.fetch(this.url("/fee_options"), createPostHTTPRequest(feeOptionArgs, headers));
    const _data = await buildResponse(res);
    return {
      currentGasPrice: _data.currentGasPrice,
      options: _data.options,
    };
  }

  async sendTransaction(args: PendingExecuteCallArgs, headers?: object): Promise<string> {
    const res = await this.fetch(this.url("/send_transaction"), createPostHTTPRequest(args, headers));
    const _data = await buildResponse(res);
    return <string>_data;
  }

  async txRecipt(txHash: string, headers?: object): Promise<TxnReceiptResult> {
    const res = await this.fetch(this.url(`/tx_receipt/${txHash}`), createGetPostHTTPRequest(headers));
    const _data = await buildResponse(res);
    return <TxnReceiptResult>_data;
  }

  async simulate(args: SimulateArgs, headers?: object): Promise<SimulateResult> {
    const res = await this.fetch(this.url(`/simulate`), createPostHTTPRequest(args, headers));
    const _data = await buildResponse(res);
    return _data;
  }

  async nonce(walletAddr: string, headers?: object): Promise<BigNumber> {
    const res = await this.fetch(this.url(`/nonce/${walletAddr}`), createGetPostHTTPRequest(headers));
    try {
      const data = await buildResponse(res);
      return BigNumber.from(data);
    } catch (error) {
      if (error.code === CONTRACT_NOT_DEPLOYED_CODE) {
        return BigNumber.from(0);
      }
    }
  }

  async metaNonce(walletAddr: string, headers?: object): Promise<BigNumber> {
    const res = await this.fetch(this.url(`/meta_nonce/${walletAddr}`), createGetPostHTTPRequest(headers));
    try {
      const data = await buildResponse(res);
      return BigNumber.from(data);
    } catch (error) {
      if (error.code === CONTRACT_NOT_DEPLOYED_CODE) {
        return BigNumber.from(0);
      }
    }
  }
}

export interface WebRPCError extends Error {
  code: number;
  msg: string;
  status: number;
}

const createPostHTTPRequest = (body: object = {}, headers: object = {}): object => ({
  method: "POST",
  headers: { ...headers, "Content-Type": "application/json" },
  body: JSON.stringify(body || {}),
});

const createGetPostHTTPRequest = (headers: object = {}): object => ({
  method: "GET",
  headers: { ...headers },
});

const buildResponse = (res: Response): Promise<any> =>
  res.text().then((text) => {
    let body;

    try {
      body = JSON.parse(text);
    } catch (err) {
      const error = {
        code: -1,
        msg: `expecting JSON, got: ${text}`,
        status: res.status,
      } as WebRPCError;
      throw error;
    }

    if (!res.ok || body.statusCode !== 200) {
      const error = {
        code: body.statusCode,
        msg: body.message || body,
        status: res.status,
      } as WebRPCError;
      throw error;
    }

    return body.data;
  });

export type Fetch = (input: RequestInfo, init?: RequestInit) => Promise<Response>;
