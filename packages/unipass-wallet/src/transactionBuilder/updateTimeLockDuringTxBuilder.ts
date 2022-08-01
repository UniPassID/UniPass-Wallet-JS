import { BytesLike, constants } from "ethers";
import { keccak256, solidityPack } from "ethers/lib/utils";
import { DkimParamsBase } from "unipass-wallet-dkim-base";
import { AccountLayerActionType } from ".";
import {
  MasterKeySigGenerator,
  RecoveryEmailsSigGenerator,
  SignType,
} from "../sigGenerator";
import { CallType, GenerateSigType, Transaction } from "../transaction";
import { BaseTxBuilder } from "./baseTxBuilder";

export class UpdateTimeLockDuringTxBuilder extends BaseTxBuilder {
  constructor(
    public userAddr: BytesLike,
    public metaNonce: number,
    public newDelay: number,
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
        ["uint32", "address", "uint8", "uint32"],
        [
          this.metaNonce,
          this.userAddr,
          AccountLayerActionType.UpdateTimeLockDuring,
          this.newDelay,
        ]
      )
    );
  }

  public async generateSigByMasterKey(
    sigGenerator: MasterKeySigGenerator,
    signType: SignType
  ): Promise<UpdateTimeLockDuringTxBuilder> {
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

  public async generateSigByRecoveryEmails(
    sigGenerator: RecoveryEmailsSigGenerator,
    dkimParams: Map<string, DkimParamsBase>
  ): Promise<UpdateTimeLockDuringTxBuilder> {
    this.signature = solidityPack(
      ["bytes", "uint8", "bytes"],
      [
        this.getSigPrefix(),
        GenerateSigType.SignByRecoveryEmail,
        await sigGenerator.generateSignature(dkimParams),
      ]
    );
    return this;
  }

  public async generateSigByMasterKeyWithDkimParams(
    sigGenerator: MasterKeySigGenerator,
    signType: SignType,
    dkimParams: Map<string, DkimParamsBase>
  ): Promise<UpdateTimeLockDuringTxBuilder> {
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

  getSigPrefix(): string {
    return solidityPack(
      ["uint8", "uint32", "uint32"],
      [
        AccountLayerActionType.UpdateTimeLockDuring,
        this.metaNonce,
        this.newDelay,
      ]
    );
  }

  public build(): Transaction {
    if (this.signature === undefined) {
      throw new Error("expected signature not undefined");
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
