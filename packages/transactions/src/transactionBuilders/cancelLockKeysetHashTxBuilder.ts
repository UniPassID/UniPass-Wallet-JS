import { BytesLike, constants, utils } from "ethers";
import { keccak256, solidityPack } from "ethers/lib/utils";
import { RoleWeight } from "@unipasswallet/keys";
import { subDigest } from "@unipasswallet/utils";
import { AccountLayerActionType } from ".";
import { CallType, Transaction } from "../transaction";
import { BaseTxBuilder } from "./baseTxBuilder";

export class CancelLockKeysetHashTxBuilder extends BaseTxBuilder {
  public readonly OWNER_THRESHOLD = 1;

  public readonly userAddr: string;

  /**
   *
   * @param userAddr The Address Of User Wallet
   * @param metaNonce MetaNonce
   * @param revertOnError Whether revert when transaction failed
   * @param signature The Signature Of Transaction
   */
  constructor(
    _userAddr: BytesLike,
    public readonly metaNonce: number,
    public readonly revertOnError: boolean,
    signature?: string
  ) {
    super(signature);
    this.userAddr = utils.hexlify(_userAddr);
  }

  /**
   *
   * @returns The Original Message For Signing
   */
  public digestMessage(): string {
    return subDigest(
      0,
      this.userAddr,
      keccak256(
        solidityPack(
          ["uint8", "uint32"],
          [AccountLayerActionType.CancelLockKeysetHash, this.metaNonce]
        )
      )
    );
  }

  validateRoleWeight(roleWeight: RoleWeight): boolean {
    return roleWeight.ownerWeight >= this.OWNER_THRESHOLD;
  }

  public build(): Transaction {
    const data = this.contractInterface.encodeFunctionData(
      "cancelLockKeysetHash",
      [this.metaNonce, this.signature]
    );

    return {
      callType: CallType.Call,
      revertOnError: this.revertOnError,
      gasLimit: constants.Zero,
      target: this.userAddr,
      value: constants.Zero,
      data,
    };
  }
}
