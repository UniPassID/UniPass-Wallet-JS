import { BytesLike, constants } from "ethers";
import { keccak256, solidityPack } from "ethers/lib/utils";
import { AccountLayerActionType } from ".";
import { RoleWeight } from "../key";
import { Transaction, CallType } from "../transaction";
import { BaseTxBuilder } from "./baseTxBuilder";

export class UpdateKeysetHashWithTimeLockTxBuilder extends BaseTxBuilder {
  public readonly GUARDIAN_THRESHOLD = 50;

  /**
   *
   * @param userAddr The Address Of User's Smart Contract Address
   * @param metaNonce The meta nonce of Account Layer
   * @param keysetHash New KeysetHash to Update
   * @param signature Signature, default undefined
   */
  constructor(
    public readonly userAddr: BytesLike,
    public readonly metaNonce: number,
    public readonly keysetHash: BytesLike,
    signature?: BytesLike
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
        ["uint32", "address", "uint8", "bytes32"],
        [
          this.metaNonce,
          this.userAddr,
          AccountLayerActionType.UpdateKeysetHash,
          this.keysetHash,
        ]
      )
    );
  }

  validateRoleWeight(roleWeight: RoleWeight): boolean {
    return roleWeight.guardianWeight >= this.GUARDIAN_THRESHOLD;
  }

  public build(): Transaction {
    const data = this.contractInterface.encodeFunctionData(
      "updateKeysetHashWithTimeLock",
      [this.metaNonce, this.keysetHash, this.signature]
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
