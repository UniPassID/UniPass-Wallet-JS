import { Bytes } from "ethers";

export enum SignType {
  EIP712Sign = 1,
  EthSign = 2,
}

export abstract class BaseSigner {
  public abstract ethSign(hash: string | Bytes): Promise<string>;

  public abstract eip712Sign(hash: string | Bytes): Promise<string>;

  public sign(hash: string | Bytes, signType: SignType): Promise<string> {
    switch (signType) {
      case SignType.EIP712Sign: {
        return this.eip712Sign(hash);
      }
      case SignType.EthSign: {
        return this.ethSign(hash);
      }
      default: {
        throw new Error(`Invalid SignType: ${signType}`);
      }
    }
  }
}
