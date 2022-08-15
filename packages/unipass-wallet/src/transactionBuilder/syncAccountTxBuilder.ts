import { BytesLike, constants } from "ethers";
import { keccak256, solidityPack } from "ethers/lib/utils";
import { AccountLayerActionType } from ".";
import { RoleWeight } from "../key";
import { Transaction, CallType } from "../transaction";
import { BaseTxBuilder } from "./baseTxBuilder";

export class SyncAccountTxBuilder extends BaseTxBuilder {
  public readonly OWNER_THRESHOLD = 100;

  /**
   *
   * @param userAddr The Address Of User's Smart Contract Address
   * @param metaNonce The meta nonce of Account Layer
   * @param keysetHash New KeysetHash to Update
   * @param signature Signature, default undefined
   */
  constructor(
    public userAddr: BytesLike,
    public metaNonce: number,
    public keysetHash: BytesLike,
    public timeLockDuring: number,
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
        ["uint32", "address", "uint8", "bytes32", "uint32"],
        [
          this.metaNonce,
          this.userAddr,
          AccountLayerActionType.SyncAccount,
          this.keysetHash,
          this.timeLockDuring,
        ]
      )
    );
  }

  validateRoleWeight(roleWeight: RoleWeight): boolean {
    return roleWeight.ownerWeight >= this.OWNER_THRESHOLD;
  }

  public build(): Transaction {
    const data = this.contractInterface.encodeFunctionData("syncAccount", [
      this.metaNonce,
      this.keysetHash,
      this.timeLockDuring,
      this.signature,
    ]);
    return {
      callType: CallType.Call,
      gasLimit: constants.Zero,
      target: this.userAddr,
      value: constants.Zero,
      data,
    };
  }
}
