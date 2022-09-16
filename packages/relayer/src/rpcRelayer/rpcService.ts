import { FeeToken, FeeOption } from "..";
import { CallType } from "@unipasswallet/transactions";
import { BigNumberish } from "ethers";

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
  call: string;
}

export interface TxnReciptLog {
  address: string;
  topics: string[];
  data: string;
}

export interface TxnReciptResult {
  txHash: string;
  index: number;
  status: string;
  revertReason?: string;
  logs: TxnReciptLog[];
}

export interface EstimateGasResult {
  executed: boolean;
  successed: boolean;
  result?: string;
  reason?: string;
  gasUsed: string;
  gasLimit: string;
}

export interface RpcService {
  feeTokens(headers?: object): Promise<FeeTokensReturn>;
  feeOptions(feeOptionArgs: FeeOptionArgs, headers?: object): Promise<FeeOptionsReturn>;
  sendTransaction(args: PendingExecuteCallArgs, headers?: object): Promise<string>;
  txRecipt(txHash: string, headers?: object): Promise<TxnReciptResult>;
  estimateGas(pendingExecuteCallArgs: PendingExecuteCallArgs, headers?: object): Promise<EstimateGasResult>;
  nonce(walletAddr: string, headers?: object): Promise<BigNumberish>;
  metaNonce(walletAddr: string, headers?: object): Promise<BigNumberish>;
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

  feeTokens(headers?: object): Promise<FeeTokensReturn> {
    return this.fetch(this.url("fee_tokens"), createGetPostHTTPRequest(headers)).then((res) =>
      buildResponse(res).then((_data) => ({
        isFeeRequired: <boolean>_data.isFeeRequired,
        tokens: <FeeToken[]>_data.tokens,
      })),
    );
  }

  feeOptions(feeOptionArgs: FeeOptionArgs, headers?: object): Promise<FeeOptionsReturn> {
    return this.fetch(this.url("/fee_options"), createPostHTTPRequest(feeOptionArgs, headers)).then((res) =>
      buildResponse(res).then((_data) => ({
        currentGasPrice: _data.currentGasPrice,
        options: _data.options,
      })),
    );
  }

  sendTransaction(args: PendingExecuteCallArgs, headers?: object): Promise<string> {
    return this.fetch(this.url("/send_transaction"), createPostHTTPRequest(args, headers)).then((res) =>
      buildResponse(res).then((_data) => <string>_data.data),
    );
  }

  txRecipt(txHash: string, headers?: object): Promise<TxnReciptResult> {
    return this.fetch(this.url(`/tx_receipt/${txHash}`), createGetPostHTTPRequest(headers)).then((res) =>
      buildResponse(res).then((_data) => <TxnReciptResult>_data.data),
    );
  }

  estimateGas(pendingExecuteCallArgs: PendingExecuteCallArgs, headers?: object): Promise<EstimateGasResult> {
    return this.fetch(this.url(`/estimate_gas`), createPostHTTPRequest(pendingExecuteCallArgs, headers)).then((res) =>
      buildResponse(res).then((_data) => _data.data),
    );
  }

  nonce(walletAddr: string, headers?: object): Promise<BigNumberish> {
    return this.fetch(this.url(`/nonce/${walletAddr}`), createGetPostHTTPRequest(headers)).then((res) =>
      buildResponse(res).then((_data) => _data.data),
    );
  }

  metaNonce(walletAddr: string, headers?: object): Promise<BigNumberish> {
    return this.fetch(this.url(`/meta_nonce/${walletAddr}`), createGetPostHTTPRequest(headers)).then((res) =>
      buildResponse(res).then((_data) => _data.data),
    );
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
      // eslint-disable-next-line no-throw-literal
      throw {
        code: "unknown",
        msg: `expecting JSON, got: ${text}`,
        status: res.status,
      } as WebRPCError;
    }

    if (!res.ok) {
      throw data; // webrpc error response
    }

    return data;
  });

export type Fetch = (input: RequestInfo, init?: RequestInit) => Promise<Response>;
