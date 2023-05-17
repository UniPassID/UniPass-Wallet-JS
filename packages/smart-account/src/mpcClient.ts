import { computeAddress } from "ethers/lib/utils";
import { worker } from "./tss";
import { SmartAccountError, SmartAccountErrorCode } from "./interface/utils";
import {
  AccountLogin,
  AccountRegister,
  Fetch,
  RegisterParams,
  ToBusinessConfig,
  TssKey,
  TssKeyGenFinishParams,
  TssKeyGenParams,
  TssRes,
  Web3AuthSig,
} from "./interface/mpcClient";

const createPostHTTPRequest = (body: object = {}, headers: object = {}): object => ({
  method: "POST",
  headers: { ...headers, "Content-Type": "application/json" },
  body: JSON.stringify(body || {}),
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const createGetHTTPRequest = (headers: object = {}): object => ({
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
        code: SmartAccountErrorCode.UnknownError,
        message: `expecting JSON, got: ${text}`,
        data: undefined,
      } as SmartAccountError<undefined>;
      throw error;
    }

    if (!res.ok || body.statusCode !== 200) {
      const error = {
        code: SmartAccountErrorCode.MpcServerError,
        message: `MPC Server Error: ${body.message}`,
        data: body,
      } as SmartAccountError<any>;
      throw error;
    }

    return body.data;
  });

export class MpcClient {
  constructor(public readonly baseUrl: string, public readonly fetch: Fetch) {}

  private getUrl(path: string): string {
    return `${this.baseUrl}${path}`;
  }

  public async login(
    appId: string,
    web3AuthSig: Web3AuthSig,
    expirationInterval: string = "30d",
  ): Promise<AccountLogin> {
    const res = await this.fetch(
      this.getUrl("/api/v1/custom-auth-account/login"),
      createPostHTTPRequest({
        web3auth: web3AuthSig,
        appId,
        expirationInterval,
      }),
    );

    const data = await buildResponse(res);
    return data;
  }

  public async register(input: RegisterParams): Promise<AccountRegister> {
    const res = await this.fetch(this.getUrl("/api/v1/custom-auth-account/register"), createPostHTTPRequest(input));

    const data = await buildResponse(res);
    return data;
  }

  public async tssKeyGenStart(authorization: string): Promise<TssRes> {
    const res = await this.fetch(
      this.getUrl("/api/v1/custom-auth-account/tss/keygen/start"),
      createPostHTTPRequest({}, { Authorization: `Bearer ${authorization}` }),
    );

    const data = await buildResponse(res);
    return data;
  }

  public async tssKeyGen(authorization: string, tssParams: TssKeyGenParams): Promise<TssRes> {
    const res = await this.fetch(
      this.getUrl("/api/v1/custom-auth-account/tss/keygen"),
      createPostHTTPRequest(tssParams, { Authorization: `Bearer ${authorization}` }),
    );

    const data = await buildResponse(res);
    return data;
  }

  public async tssKeyGenFinish(authorization: string, tssParams: TssKeyGenFinishParams): Promise<TssRes> {
    const res = await this.fetch(
      this.getUrl("/api/v1/custom-auth-account/tss/keygen/finish"),
      createPostHTTPRequest(tssParams, { Authorization: `Bearer ${authorization}` }),
    );

    const data = await buildResponse(res);
    return data;
  }

  public async tssGenerateKey(authorization: string): Promise<TssKey> {
    const { tssRes } = await this.tssKeyGenStart(authorization);
    const [context2, p2FirstMsg] = await worker.li17_p2_key_gen1(tssRes.msg);
    const tssKeyGenParams = {
      sessionId: tssRes.sessionId,
      tssMsg: p2FirstMsg,
    };
    const { tssRes: tssKeyGenRes } = await this.tssKeyGen(authorization, tssKeyGenParams);
    const [signContext2, pubkey] = await worker.li17_p2_key_gen2(tssKeyGenRes, context2);
    const tssKeyAddress = computeAddress(pubkey.point);
    const tssKeyGenFinishParams = {
      userId: tssRes.userId,
      sessionId: tssRes.sessionId,
      tssKeyAddress,
    };
    await this.tssKeyGenFinish(authorization, tssKeyGenFinishParams);

    return {
      tssKeyAddress,
      userId: tssRes.userId,
      userKeySignContext: signContext2,
    };
  }

  public async config(appId: string, chainId: number): Promise<ToBusinessConfig> {
    const res = await this.fetch(
      this.getUrl("/api/v1/custom-auth-account/tss/gen/finish"),
      createPostHTTPRequest({
        appId,
        chainId,
      }),
    );

    const data = await buildResponse(res);
    return data;
  }
}
