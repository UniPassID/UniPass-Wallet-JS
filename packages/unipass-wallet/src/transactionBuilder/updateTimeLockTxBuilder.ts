import { BytesLike, constants } from "ethers";
import { keccak256, solidityPack } from "ethers/lib/utils";
import { DkimParamsBase } from "unipass-wallet-dkim-base";
import { AccountLayerActionType } from ".";
import { MasterKeySigGenerator, SignType } from "../sigGenerator";
import { CallType, Transaction } from "../transaction";
import { BaseTxBuilder } from "./baseTxBuilder";

export class UpdateTimeLockTxBuilder extends BaseTxBuilder {
  constructor(
    public userAddr: BytesLike,
    public metaNonce: number,
    public newDelay: number,
    public signature: string | undefined = undefined
  ) {
    super();
  }

  public digestMessage(): string {
    return keccak256(
      solidityPack(
        ["uint32", "address", "uint32"],
        [this.metaNonce, this.userAddr, this.newDelay]
      )
    );
  }

  public generateSigByMasterKeyWithDkimParams(
    sigGenerator: MasterKeySigGenerator,
    signType: SignType,
    dkimParams: Map<string, DkimParamsBase>
  ): UpdateTimeLockTxBuilder {
    this.signature = solidityPack(
      ["bytes", "bytes"],
      [
        this.getSigPrefix(),
        sigGenerator.generateSignatureWithDkimParams(
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
      ["uint8", "uint32", "bytes32"],
      [AccountLayerActionType.UpdateTimeLock, this.metaNonce, this.newDelay]
    );
  }

  public build(): Transaction {
    if (this.signature === undefined) {
      throw new Error("expected signature not undefined");
    }
    return new Transaction(
      CallType.CallAccountLayer,
      constants.Zero,
      "0x",
      constants.Zero,
      this.signature
    );
  }
}
