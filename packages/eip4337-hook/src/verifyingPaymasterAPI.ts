import { ethers, BytesLike } from "ethers";
import { PaymasterAPI, calcPreVerificationGas } from "@account-abstraction/sdk";
import { UserOperationStruct } from "@account-abstraction/contracts";
import fetchPonyfill from "fetch-ponyfill";
import { toJSON } from "./utils";
import { defineReadOnly } from "ethers/lib/utils";

export const DUMMY_PAYMASTER_AND_DATA =
  "0x0101010101010101010101010101010101010101000000000000000000000000000000000000000000000000000001010101010100000000000000000000000000000000000000000000000000000000000000000101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101";

export interface paymasterResponse {
  jsonrpc: string;
  id: number;
  result: BytesLike;
}

export type Fetch = (input: RequestInfo, init?: RequestInit) => Promise<Response>;

export interface WebRPCError extends Error {
  code: number;
  message: string;
  status: number;
}

export const createPostHTTPRequest = (body: object = {}, headers: object = {}): object => ({
  method: "POST",
  headers: { ...headers, "Content-Type": "application/json" },
  body: JSON.stringify(body || {}),
});

export const buildResponse = (res: Response): Promise<any> =>
  res.text().then((text) => {
    let body;

    try {
      body = JSON.parse(text);
    } catch (err) {
      const error = {
        code: -1,
        message: `expecting JSON, got: ${text}`,
        status: res.status,
      } as WebRPCError;
      throw error;
    }

    if (!res.ok && body.error) {
      const error = {
        code: body.error.code,
        message: body.error.message || body,
        status: res.status,
      } as WebRPCError;
      throw error;
    }

    return body.result;
  });

export class VerifyingPaymasterAPI extends PaymasterAPI {
  public readonly fetch: Fetch;

  public readonly _isVerifyingPaymasterAPI: boolean;

  constructor(
    public readonly chainId: number,
    public readonly sigSize: number,
    public readonly paymasterUrl: string,
    public readonly entryPoint: string,
    originFetch?: typeof fetch,
  ) {
    super();
    this.fetch = originFetch || fetchPonyfill().fetch;
    defineReadOnly(this, "_isVerifyingPaymasterAPI", true);
  }

  async getPaymasterAndData(userOp: Partial<UserOperationStruct>): Promise<string> {
    // Hack: userOp includes empty paymasterAndData which calcPreVerificationGas requires.
    try {
      // userOp.preVerificationGas contains a promise that will resolve to an error.
      await ethers.utils.resolveProperties(userOp);
      // eslint-disable-next-line no-empty
    } catch (_) {}
    const pmOp: Partial<UserOperationStruct> = {
      sender: userOp.sender,
      nonce: userOp.nonce,
      initCode: userOp.initCode,
      callData: userOp.callData,
      callGasLimit: userOp.callGasLimit,
      verificationGasLimit: userOp.verificationGasLimit,
      maxFeePerGas: userOp.maxFeePerGas,
      maxPriorityFeePerGas: userOp.maxPriorityFeePerGas,
      // A dummy value here is required in order to calculate a correct preVerificationGas value.
      paymasterAndData: DUMMY_PAYMASTER_AND_DATA,
      signature: ethers.utils.hexlify(Buffer.alloc(this.sigSize, 1)),
    };
    const op = await ethers.utils.resolveProperties(pmOp);
    op.preVerificationGas = calcPreVerificationGas(op, { sigSize: this.sigSize });

    // Ask the paymaster to sign the transaction and return a valid paymasterAndData value.
    const ret = await this.fetch(
      this.paymasterUrl,
      createPostHTTPRequest({
        jsonrpc: "2.0",
        id: 1,
        method: "pm_sponsorUserOperation",
        params: [this.chainId, await toJSON(op), this.entryPoint],
      }),
    );
    const { isWhiteList, paymaster_and_data } = await buildResponse(ret);

    if (!isWhiteList) {
      throw new Error(`Sender[${op.sender}] is not in the white list`);
    }
    return paymaster_and_data;
  }

  async isWhiteList(chain: number, sender: string): Promise<boolean> {
    const ret = await this.fetch(
      this.paymasterUrl,
      createPostHTTPRequest({
        jsonrpc: "2.0",
        id: 1,
        method: "pm_isWhiteList",
        params: [chain, sender],
      }),
    );
    const data: boolean = await buildResponse(ret);
    return data;
  }

  static isVerifyingPaymasterAPI(v: any): v is VerifyingPaymasterAPI {
    return v._isVerifyingPaymasterAPI;
  }
}
