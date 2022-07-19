import { BytesLike, constants } from "ethers";
import { keccak256, solidityPack } from "ethers/lib/utils";
import { DkimParams } from "unipass-wallet-dkim";
import { AccountLayerActionType } from ".";
import {
  MasterKeySigGenerator,
  RecoveryEmailsSigGenerator,
  SignType,
} from "../sigGenerator";
import { Transaction, CallType, GenerateSigType } from "../transaction";
import { BaseTxBuilder } from "./baseTxBuilder";

export class UpdateKeysetHashTxBuilder extends BaseTxBuilder {
  public signature: string;

  constructor(
    public userAddr: BytesLike,
    public metaNonce: number,
    public newKeysetHash: BytesLike
  ) {
    super();
  }

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

  public generateSigByRecoveryEmails(
    sigGenerator: RecoveryEmailsSigGenerator,
    dkimParams: Map<string, DkimParams>
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

  public generateSigByMasterKeyWithDkimParams(
    sigGenerator: MasterKeySigGenerator,
    signType: SignType,
    dkimParams: Map<string, DkimParams>
  ): UpdateKeysetHashTxBuilder {
    this.signature = solidityPack(
      ["bytes", "uint8", "bytes"],
      [
        this.getSigPrefix(),
        GenerateSigType.signByMasterKeyWithDkimParams,
        sigGenerator.generateSignatureWithDkimParams(
          this.digestMessage(),
          signType,
          dkimParams
        ),
      ]
    );
    return this;
  }

  public digestMessage(): string {
    return keccak256(
      solidityPack(
        ["uint32", "address", "bytes32"],
        [this.metaNonce, this.userAddr, this.newKeysetHash]
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
