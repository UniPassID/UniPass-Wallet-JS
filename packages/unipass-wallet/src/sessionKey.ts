import { utils, Wallet } from "ethers";
import { KeyBase, sign, SignType } from "./key";

export class SessionKey {
  constructor(
    public key: Wallet,
    public timestamp: number,
    public weight: number,
    public signType: SignType
  ) {}

  public digestMessage(): string {
    return utils.keccak256(
      utils.solidityPack(
        ["address", "uint32", "uint32"],
        [this.key.address, this.timestamp, this.weight]
      )
    );
  }

  public async generateSignature(
    digestHash: string,
    selectedKeys: [KeyBase, boolean][]
  ): Promise<string> {
    let sig = utils.solidityPack(
      ["uint32", "uint32", "bytes"],
      [
        this.timestamp,
        this.weight,
        await sign(digestHash, this.key, this.signType),
      ]
    );

    const sessionKeyDigestHash = this.digestMessage();
    let selectedWeight = 0;
    // eslint-disable-next-line no-restricted-syntax
    for (const [key, isSig] of selectedKeys) {
      if (isSig) {
        selectedWeight += key.roleWeight.assetsOpWeight;
        sig = utils.solidityPack(
          ["bytes", "bytes"],
          // eslint-disable-next-line no-await-in-loop
          [sig, await key.generateSignature(sessionKeyDigestHash)]
        );
      } else {
        sig = utils.solidityPack(["bytes", "bytes"], [sig, key.generateKey()]);
      }
    }

    if (selectedWeight < this.weight) {
      throw new Error(
        `Expected Key Weight[${this.weight}], Less than ${selectedWeight}`
      );
    }
    return sig;
  }

  // eslint-disable-next-line class-methods-use-this
  public serialize(): string {
    throw new Error("Not Need Serialize");
  }
}
