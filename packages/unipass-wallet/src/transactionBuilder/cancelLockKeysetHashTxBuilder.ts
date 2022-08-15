import { BytesLike, constants } from "ethers";
import { keccak256, solidityPack } from "ethers/lib/utils";
import { AccountLayerActionType } from ".";
import { CallType, Transaction } from "../transaction";
import { BaseTxBuilder } from "./baseTxBuilder";
import { RoleWeight } from "../key";

export class CancelLockKeysetHashTxBuilder extends BaseTxBuilder {
  readonly OWNER_THRESHOLD = 1;

  /**
   *
   * @param userAddr The Address Of User Wallet
   * @param metaNonce MetaNonce
   * @param signature The Signature Of Transaction
   */
  constructor(
    public userAddr: BytesLike,
    public metaNonce: number,
    signature?: string
  ) {
    super(signature);
  }

  /**
   *
   * @returns The Original Message For Signing
   */
  public digestMessage(): string {
    return keccak256(
      solidityPack(
        ["uint32", "address", "uint8"],
        [
          this.metaNonce,
          this.userAddr,
          AccountLayerActionType.CancelLockKeysetHash,
        ]
      )
    );
  }

  validateRoleWeight(roleWeight: RoleWeight): boolean {
    return roleWeight.ownerWeight >= this.OWNER_THRESHOLD;
  }

  public build(): Transaction {
    const data = this.contractInterface.encodeFunctionData(
      "cancelLockKeysetHsah",
      [this.metaNonce, this.signature]
    );
    return {
      callType: CallType.Call,
      gasLimit: constants.Zero,
      target: this.userAddr,
      value: constants.Zero,
      data,
    };
  }
}
