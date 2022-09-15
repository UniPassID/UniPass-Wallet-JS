import { BytesLike, constants, utils } from "ethers";
import { keccak256, solidityPack } from "ethers/lib/utils";
import { RoleWeight } from "@unipasswallet/keys";
import { subDigest } from "@unipasswallet/utils";
import { Transaction, CallType } from "@unipasswallet/transactions";
import { AccountLayerActionType } from ".";
import { BaseTxBuilder } from "./baseTxBuilder";

export class UpdateKeysetHashWithTimeLockTxBuilder extends BaseTxBuilder {
  public readonly GUARDIAN_THRESHOLD = 50;

  public readonly userAddr;

  public readonly keysetHash;

  /**
   *
   * @param userAddr The Address Of User's Smart Contract Address
   * @param metaNonce The meta nonce of Account Layer
   * @param keysetHash New KeysetHash to Update
   * @param revertOnError Whether revert when transaction failed
   * @param signature Signature, default undefined
   */
  constructor(
    userAddr: BytesLike,
    public readonly metaNonce: number,
    keysetHash: BytesLike,
    public readonly revertOnError: boolean,
    signature?: BytesLike
  ) {
    super(signature);
    this.userAddr = utils.hexlify(userAddr);
    this.keysetHash = utils.hexlify(keysetHash);
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
          ["uint8", "uint32", "bytes32"],
          [
            AccountLayerActionType.UpdateKeysetHash,
            this.metaNonce,
            this.keysetHash,
          ]
        )
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
      _isUnipassWalletTransaction: true,
      revertOnError: this.revertOnError,
      callType: CallType.Call,
      gasLimit: constants.Zero,
      target: this.userAddr,
      value: constants.Zero,
      data,
    };
  }
}
