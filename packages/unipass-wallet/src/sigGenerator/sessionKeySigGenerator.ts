import { Wallet } from "ethers";
import {
  arrayify,
  Bytes,
  BytesLike,
  keccak256,
  solidityPack,
} from "ethers/lib/utils";
import { MasterKeySigGenerator } from "./masterKeySigGenerator";
import { RecoveryEmails } from "../recoveryEmails";
import { BaseSigner, SignType } from "./baseSigner";

export class SessionKeySigGenerator extends BaseSigner {
  constructor(
    public sessionKey: Wallet,
    public expired: number,
    public recoveryEmails: RecoveryEmails,
    public permit: string | undefined = undefined
  ) {
    super();
  }

  async init(
    masterKeySigner: MasterKeySigGenerator,
    signType: SignType
  ): Promise<SessionKeySigGenerator> {
    this.permit = await masterKeySigner.sign(
      this.digestPermitMessage(),
      signType
    );
    return this;
  }

  public ethSign(hash: BytesLike): Promise<string> {
    return this.sessionKey.signMessage(arrayify(hash));
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars, class-methods-use-this
  public eip712Sign(hash: BytesLike): Promise<string> {
    throw new Error(`Unimplement`);
  }

  public digestPermitMessage(): string {
    return keccak256(
      solidityPack(
        ["address", "uint256"],
        [this.sessionKey.address, this.expired]
      )
    );
  }

  public async getPermit(
    masterKeySigner: MasterKeySigGenerator,
    signType: SignType
  ): Promise<string> {
    return masterKeySigner.sign(this.digestPermitMessage(), signType);
  }

  public async generateSignature(
    hash: string | Bytes,
    signType: SignType
  ): Promise<string> {
    if (this.permit === undefined) {
      throw new Error("Permit is undefined, Please init Permit");
    }
    let sig = await this.sign(hash, signType);
    sig = solidityPack(
      ["address", "uint256", "bytes", "bytes"],
      [
        this.sessionKey.address,
        this.expired,
        sig,
        this.recoveryEmails.serializeWithSignature(this.permit),
      ]
    );
    return sig;
  }
}
