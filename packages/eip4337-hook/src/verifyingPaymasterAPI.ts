import { ethers, BytesLike } from "ethers";
import { PaymasterAPI, calcPreVerificationGas } from "@account-abstraction/sdk";
import { UserOperationStruct } from "@account-abstraction/contracts";
import fetchPonyfill from "fetch-ponyfill";
import { toJSON } from "./utils";

const SIG_SIZE = 65;
const DUMMY_PAYMASTER_AND_DATA =
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

const createPostHTTPRequest = (body: object = {}, headers: object = {}): object => ({
  method: "POST",
  headers: { ...headers, "Content-Type": "application/json" },
  body: JSON.stringify(body || {}),
});

const buildResponse = (res: Response): Promise<any> =>
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

    if (!res.ok || body.statusCode !== 200) {
      const error = {
        code: body.statusCode,
        message: body.message || body,
        status: res.status,
      } as WebRPCError;
      throw error;
    }

    return body.data;
  });

export class VerifyingPaymasterAPI extends PaymasterAPI {
  public readonly fetch: Fetch;

  constructor(
    public readonly chainId: number,
    public readonly paymasterUrl: string,
    public readonly entryPoint: string,
    originFetch?: typeof fetch,
  ) {
    super();
    this.fetch = originFetch || fetchPonyfill().fetch;
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
      signature: ethers.utils.hexlify(Buffer.alloc(SIG_SIZE, 1)),
    };
    const op = await ethers.utils.resolveProperties(pmOp);
    op.preVerificationGas = calcPreVerificationGas(op);

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
    const data: string = await buildResponse(ret);
    return data;
  }
}
