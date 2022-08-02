import { Bytes } from "ethers";
import { BytesLike, solidityPack } from "ethers/lib/utils";
import { SignError } from "../error";

export enum SignType {
  EIP712Sign = 1,
  EthSign = 2,
}

export abstract class BaseSigner {
  public abstract ethSign(hash: BytesLike): Promise<string>;

  public abstract eip712Sign(hash: BytesLike): Promise<string>;

  public async sign(hash: string | Bytes, signType: SignType): Promise<string> {
    let sig;
    switch (signType) {
      case SignType.EIP712Sign: {
        sig = await this.eip712Sign(hash);
        break;
      }
      case SignType.EthSign: {
        sig = await this.ethSign(hash);
        break;
      }
      default: {
        throw new SignError("Invalid SignType", signType);
      }
    }
    return solidityPack(["bytes", "uint8"], [sig, signType]);
  }
}
