import { Wallet } from "ethers";
import { Bytes, keccak256, solidityPack } from "ethers/lib/utils";
import { MasterKeySigGenerator } from "./masterKeySigGenerator";
import { RecoveryEmails } from "../recoveryEmails";
import { BaseSigner, SignType } from "./baseSigner";

export class SessionKeySigGenerator extends BaseSigner {
  public permit: string;

  constructor(
    public sessionKey: Wallet,
    public expired: number,
    public recoveryEmails: RecoveryEmails
  ) {
    super();
  }

  async init(masterKeySigner: MasterKeySigGenerator, signType: SignType) {
    this.permit = await masterKeySigner.sign(
      this.digestPermitMessage(),
      signType
    );
  }

  public ethSign(hash: string | Bytes): Promise<string> {
    return this.sessionKey.signMessage(hash);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars, class-methods-use-this
  public eip712Sign(hash: string | Bytes): Promise<string> {
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
