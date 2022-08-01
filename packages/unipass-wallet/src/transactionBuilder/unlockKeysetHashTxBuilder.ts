import { BytesLike, constants } from "ethers";
import { keccak256, solidityPack } from "ethers/lib/utils";
import { AccountLayerActionType } from ".";

import { CallType, GenerateSigType, Transaction } from "../transaction";
import { BaseTxBuilder } from "./baseTxBuilder";

export class UnlockKeysetHashTxBuilder extends BaseTxBuilder {
  /**
   *
   * @param userAddr The Address Of User Wallet
   * @param metaNonce MetaNonce
   * @param signature The Signature Of Transaction
   */
  constructor(
    public userAddr: BytesLike,
    public metaNonce: number,
    public signature: string | undefined = undefined
  ) {
    super();
  }

  /**
   *
   * @returns The Original Message For Signing
   */
  public digestMessage(): string {
    return keccak256(
      solidityPack(
        ["uint32", "address", "uint8"],
        [this.metaNonce, this.userAddr, AccountLayerActionType.UnlockKeysetHash]
      )
    );
  }

  public generateSigBySignNone(): UnlockKeysetHashTxBuilder {
    this.signature = solidityPack(
      ["bytes", "uint8"],
      [this.getSigPrefix(), GenerateSigType.SignNone]
    );
    return this;
  }

  getSigPrefix(): string {
    return solidityPack(
      ["uint8", "uint32"],
      [AccountLayerActionType.UnlockKeysetHash, this.metaNonce]
    );
  }

  public build(): Transaction {
    return new Transaction(
      CallType.CallAccountLayer,
      constants.Zero,
      constants.AddressZero,
      constants.Zero,
      this.signature
    );
  }
}
