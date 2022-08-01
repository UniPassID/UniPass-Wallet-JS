import { BytesLike, constants } from "ethers";
import { keccak256, solidityPack } from "ethers/lib/utils";
import { DkimParamsBase } from "unipass-wallet-dkim-base";
import { AccountLayerActionType } from ".";
import { MasterKeySigGenerator, SignType } from "../sigGenerator";
import { Transaction, CallType } from "../transaction";
import { BaseTxBuilder } from "./baseTxBuilder";

export class UpdateImplementationTxBuilder extends BaseTxBuilder {
  /**
   *
   * @param userAddr The Address Of User's Smart Contract Address
   * @param metaNonce The meta nonce of Account Layer
   * @param signature Signature, default undefined
   */
  constructor(
    public userAddr: BytesLike,
    public metaNonce: number,
    public implemenation: BytesLike,
    public signature: string | undefined = undefined
  ) {
    super();
  }

  public async generateSigByMasterKeyWithDkimParams(
    sigGenerator: MasterKeySigGenerator,
    signType: SignType,
    dkimParams: Map<string, DkimParamsBase>
  ): Promise<UpdateImplementationTxBuilder> {
    this.signature = solidityPack(
      ["bytes", "bytes"],
      [
        this.getSigPrefix(),
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
        ["uint32", "address", "uint8", "address"],
        [
          this.metaNonce,
          this.userAddr,
          AccountLayerActionType.UpdateImplementation,
          this.implemenation,
        ]
      )
    );
  }

  getSigPrefix(): string {
    return solidityPack(
      ["uint8", "uint32", "address"],
      [
        AccountLayerActionType.UpdateImplementation,
        this.metaNonce,
        this.implemenation,
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
