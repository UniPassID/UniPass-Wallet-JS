import { BytesLike, utils, Wallet as WalletEOA } from "ethers";
import { sign, SignType } from "@unipasswallet/keys";
import { IPermit } from "./permit";
import { subDigest } from "@unipasswallet/utils";
import { Wallet } from "./wallet";

export class SessionKey {
  public readonly userAddr: string;

  constructor(
    public readonly wallet: WalletEOA,
    public readonly signType: SignType,
    _userAddr: BytesLike,
    public permit?: IPermit,
  ) {
    this.userAddr = utils.hexlify(_userAddr);
  }

  public digestPermitMessage(timestamp: number, weight: number): string {
    return subDigest(
      0,
      this.userAddr,
      utils.keccak256(utils.solidityPack(["address", "uint32", "uint32"], [this.wallet.address, timestamp, weight])),
    );
  }

  public async generatePermit(
    timestamp: number,
    weight: number,
    wallet: Wallet,
    signerIndexes: number[],
  ): Promise<SessionKey> {
    const permitDigestHash = this.digestPermitMessage(timestamp, weight);

    const permit = await wallet.signPermit(permitDigestHash, signerIndexes);

    this.permit = {
      timestamp,
      weight,
      permit,
    };

    return this;
  }

  public async generateSignature(digestHash: string): Promise<string> {
    return utils.solidityPack(
      ["uint32", "uint32", "bytes", "bytes"],
      [
        this.permit!.timestamp,
        this.permit!.weight,
        await sign(digestHash, this.wallet, this.signType),
        this.permit!.permit,
      ],
    );
  }
}
