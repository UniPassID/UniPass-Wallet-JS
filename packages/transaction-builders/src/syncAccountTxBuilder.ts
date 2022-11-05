import { BytesLike, constants, utils } from "ethers";
import { keccak256, solidityPack } from "ethers/lib/utils";
import { RoleWeight } from "@unipasswallet/keys";
import { subDigest } from "@unipasswallet/utils";
import { AccountLayerActionType } from ".";
import { Transaction, CallType } from "@unipasswallet/transactions";
import { BaseTxBuilder } from "./baseTxBuilder";

export class SyncAccountTxBuilder extends BaseTxBuilder {
  public readonly OWNER_THRESHOLD = 100;

  public readonly userAddr: string;

  public readonly keysetHash: string;

  public readonly implementation: string;

  /**
   *
   * @param userAddr The Address Of User's Smart Contract Address
   * @param metaNonce The meta nonce of Account Layer
   * @param keysetHash New KeysetHash to Update
   * @param implementation New Implementation to Update
   * @param revertOnError Whether revert when transaction failed
   * @param signature Signature, default undefined
   */
  constructor(
    userAddr: BytesLike,
    public readonly metaNonce: number,
    keysetHash: BytesLike,
    public readonly timeLockDuring: number,
    implementation: BytesLike,
    public readonly revertOnError: boolean,
    signature?: BytesLike,
    preGenerateSignatureFunc?: (builder: SyncAccountTxBuilder) => Promise<boolean>,
  ) {
    super(signature, preGenerateSignatureFunc);
    this.userAddr = utils.hexlify(userAddr);
    this.keysetHash = utils.hexlify(keysetHash);
    this.implementation = utils.hexlify(implementation);
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
          ["uint8", "uint32", "bytes32", "uint32", "address"],
          [
            AccountLayerActionType.SyncAccount,
            this.metaNonce,
            this.keysetHash,
            this.timeLockDuring,
            this.implementation,
          ],
        ),
      ),
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
      this.implementation,
      this.signature,
    ]);

    return {
      _isUnipassWalletTransaction: true,
      callType: CallType.Call,
      revertOnError: this.revertOnError,
      gasLimit: constants.Zero,
      target: this.userAddr,
      value: constants.Zero,
      data,
    };
  }
}
