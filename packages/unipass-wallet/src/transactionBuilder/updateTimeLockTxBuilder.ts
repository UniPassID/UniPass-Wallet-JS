import { BytesLike, constants } from "ethers";
import { keccak256, solidityPack } from "ethers/lib/utils";
import { DkimParams } from "unipass-wallet-dkim";
import { AccountLayerActionType } from ".";
import { MasterKeySigGenerator, SignType } from "../sigGenerator";
import { CallType, Transaction } from "../transaction";
import { BaseTxBuilder } from "./baseTxBuilder";

export class UpdateTimeLockTxBuilder extends BaseTxBuilder {
  public signature: string;

  constructor(
    public userAddr: BytesLike,
    public metaNonce: number,
    public newDelay: number
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
    dkimParams: Map<string, DkimParams>
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
    return new Transaction(
      CallType.CallAccountLayer,
      constants.Zero,
      "0x",
      constants.Zero,
      this.signature
    );
  }
}
