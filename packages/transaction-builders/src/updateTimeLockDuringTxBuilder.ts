import { BytesLike, constants, utils } from "ethers";
import { keccak256, solidityPack } from "ethers/lib/utils";
import { RoleWeight } from "@unipasswallet/keys";
import { subDigest } from "@unipasswallet/utils";
import { AccountLayerActionType } from ".";
import { Transaction, CallType } from "@unipasswallet/transactions";
import { BaseTxBuilder } from "./baseTxBuilder";

export class UpdateTimeLockDuringTxBuilder extends BaseTxBuilder {
  public readonly OWNER_THRESHOLD = 100;

  public readonly userAddr: string;

  constructor(
    userAddr: BytesLike,
    public readonly metaNonce: number,
    public readonly timeLockDuring: number,
    public readonly revertOnError: boolean,
    signature?: BytesLike
  ) {
    super(signature);
    this.userAddr = utils.hexlify(userAddr);
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
          ["uint8", "uint32", "uint32"],
          [
            AccountLayerActionType.UpdateTimeLockDuring,
            this.metaNonce,
            this.timeLockDuring,
          ]
        )
      )
    );
  }

  validateRoleWeight(roleWeight: RoleWeight): boolean {
    return roleWeight.ownerWeight >= this.OWNER_THRESHOLD;
  }

  public build(): Transaction {
    const data = this.contractInterface.encodeFunctionData(
      "updateTimeLockDuring",
      [this.metaNonce, this.timeLockDuring, this.signature]
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
