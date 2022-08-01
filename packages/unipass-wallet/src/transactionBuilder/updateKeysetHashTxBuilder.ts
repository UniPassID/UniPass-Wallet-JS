import { BytesLike, constants } from "ethers";
import { keccak256, solidityPack } from "ethers/lib/utils";
import { DkimParamsBase } from "unipass-wallet-dkim-base";
import { AccountLayerActionType } from ".";
import {
  MasterKeySigGenerator,
  RecoveryEmailsSigGenerator,
  SignType,
} from "../sigGenerator";
import { Transaction, CallType, GenerateSigType } from "../transaction";
import { BaseTxBuilder } from "./baseTxBuilder";

export class UpdateKeysetHashTxBuilder extends BaseTxBuilder {
  /**
   *
   * @param userAddr The Address Of User's Smart Contract Address
   * @param metaNonce The meta nonce of Account Layer
   * @param newKeysetHash New KeysetHash to Update
   * @param signature Signature, default undefined
   */
  constructor(
    public userAddr: BytesLike,
    public metaNonce: number,
    public newKeysetHash: BytesLike,
    public signature: string | undefined = undefined
  ) {
    super();
  }

  /**
   *
   * @dev In this way, may need to unlock newKeysetHash
   * @param sigGenerator MasterKey Signature Generator
   * @param signType Sign Type
   * @returns UpdateKeysetHashTxBuilder
   */
  public async generateSigByMasterKey(
    sigGenerator: MasterKeySigGenerator,
    signType: SignType
  ): Promise<UpdateKeysetHashTxBuilder> {
    this.signature = solidityPack(
      ["bytes", "uint8", "bytes"],
      [
        this.getSigPrefix(),
        GenerateSigType.SignByMasterKey,
        await sigGenerator.generateSignature(this.digestMessage(), signType),
      ]
    );
    return this;
  }

  /**
   * @dev In this way, may need to unlock newKeysetHash.
   * @param sigGenerator RecoveryEmails Signature Generator
   * @param dkimParams The Map Of Recovery Email Address And DkimParamsBase
   * @returns UpdateKeysetHashTxBuilder
   */
  public generateSigByRecoveryEmails(
    sigGenerator: RecoveryEmailsSigGenerator,
    dkimParams: Map<string, DkimParamsBase>
  ): UpdateKeysetHashTxBuilder {
    this.signature = solidityPack(
      ["bytes", "uint8", "bytes"],
      [
        this.getSigPrefix(),
        GenerateSigType.SignByRecoveryEmail,
        sigGenerator.generateSignature(dkimParams),
      ]
    );
    return this;
  }

  /**
   *
   * @dev In this way, Not need to unlock newKeysetHash
   * @param sigGenerator Both MasterKey And RecoveryEmails Signature Generator
   * @param signType Sign Type
   * @param dkimParams The Map Of Recovery Email Address And DkimParamsBase
   * @returns UpdateKeysetHashTxBuilder
   */
  public async generateSigByMasterKeyWithDkimParams(
    sigGenerator: MasterKeySigGenerator,
    signType: SignType,
    dkimParams: Map<string, DkimParamsBase>
  ): Promise<UpdateKeysetHashTxBuilder> {
    this.signature = solidityPack(
      ["bytes", "uint8", "bytes"],
      [
        this.getSigPrefix(),
        GenerateSigType.signByMasterKeyWithDkimParams,
        await sigGenerator.generateSignatureWithDkimParams(
          this.digestMessage(),
          signType,
          dkimParams
        ),
      ]
    );
    return this;
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
          this.newKeysetHash,
        ]
      )
    );
  }

  getSigPrefix(): string {
    return solidityPack(
      ["uint8", "uint32", "bytes32"],
      [
        AccountLayerActionType.UpdateKeysetHash,
        this.metaNonce,
        this.newKeysetHash,
      ]
    );
  }

  public build(): Transaction {
    if (this.signature === undefined) {
      throw new Error("expecting generating signature");
    }
    return new Transaction(
      CallType.CallAccountLayer,
      constants.Zero,
      constants.AddressZero,
      constants.Zero,
      this.signature
    );
  }
}
