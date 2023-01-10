import { FeeToken, FeeOption } from "..";
import { CallType, Transaction } from "@unipasswallet/transactions";
import { KeyType } from "@unipasswallet/keys";
import { BigNumber } from "ethers";
import { hexlify } from "ethers/lib/utils";

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

export function toUnipassTransaction(tx: Transaction): UnipassTransaction {
  return {
    ...tx,
    target: hexlify(tx.target),
    gasLimit: tx.gasLimit.toHexString(),
    value: tx.value.toHexString(),
    data: hexlify(tx.data),
  };
}

export interface ExecuteCall {
  txs: UnipassTransaction[];
  nonce: string;
  signature: string;
}

export interface PendingExecuteCallArgs {
  chainId: string;
  txHash: string;
  walletAddress: string;
  estimateGas: string;
  feeToken?: string;
  call: string;
}

export interface TxnReciptLog {
  address: string;
  topics: string[];
  data: string;
}

export interface TxnReceiptResult {
  txHash: string;
  index: number;
  status: number;
  revertReason?: string;
  logs?: TxnReciptLog[];
  receipts: TxnReceiptResult[];
}

export interface SimulateArgs {
  target: string;
  execute: SimulateExecute;
  keyset: SimulateKey[];
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
}

export interface TokenInfo {
  token: string;
  gasUsed: string;
  tokenPrice: number;
  natimveTokenPrice: number;
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
    const _data = await buildResponse(res);
    return BigNumber.from(_data);
  }

  async metaNonce(walletAddr: string, headers?: object): Promise<BigNumber> {
    const res = await this.fetch(this.url(`/meta_nonce/${walletAddr}`), createGetPostHTTPRequest(headers));
    const _data = await buildResponse(res);
    return BigNumber.from(_data);
  }
}

export interface WebRPCError extends Error {
  code: string;
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
    let data;

    try {
      data = JSON.parse(text);
    } catch (err) {
      const error = {
        code: "unknown",
        msg: `expecting JSON, got: ${text}`,
        status: res.status,
      } as WebRPCError;
      throw error;
    }

    if (!res.ok || data.statusCode !== 200) {
      const error = {
        code: data.statusCode,
        msg: data.message || data,
        status: res.status,
      } as WebRPCError;
      throw error;
    }

    return data.data;
  });

export type Fetch = (input: RequestInfo, init?: RequestInit) => Promise<Response>;
