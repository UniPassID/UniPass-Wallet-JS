import { Bytes, Signer, providers } from "ethers";
import {
  concat,
  Deferrable,
  hexlify,
  keccak256,
  toUtf8Bytes,
} from "ethers/lib/utils";
import { RoleWeight } from "@unipasswallet/keys";
import { Keyset } from "./keyset";

export class Wallet extends Signer {
  constructor(
    public readonly address: string,
    public readonly keyset: Keyset,
    public readonly provider?: providers.Provider
  ) {
    super();
  }

  setKeyset(keyset: Keyset): Wallet {
    return new Wallet(this.address, keyset, this.provider);
  }

  async getAddress(): Promise<string> {
    return this.address;
  }

  getSignRoleWeight(signerIndexes: number[]): RoleWeight {
    return this.keyset.keys
      .filter((_, index) => signerIndexes.includes(index))
      .map((v) => v.roleWeight)
      .reduce((pre, current) => pre.add(current));
  }

  async signMessage(
    message: Bytes | string,
    signerIndexes: number[] = [],
    isDigest: boolean = true
  ): Promise<string> {
    let parsedMessage = message;

    if (typeof parsedMessage === "string") {
      parsedMessage = toUtf8Bytes(parsedMessage);
    }
    const digestHash = isDigest ? message : keccak256(message);
    const signRet = await Promise.all(
      this.keyset.keys.map(async (key, index) => {
        if (signerIndexes.includes(index)) {
          return key.generateSignature(digestHash);
        }

        return key.generateKey();
      })
    );

    return hexlify(concat(signRet));
  }

  connect(provider: providers.Provider): Wallet {
    return new Wallet(this.address, this.keyset, provider);
  }

  signTransaction(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _transaction: Deferrable<providers.TransactionRequest>
  ): Promise<string> {
    throw new Error("Not Support signTransaction");
  }
}
