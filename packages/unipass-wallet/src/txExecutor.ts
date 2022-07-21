import { BigNumber, BytesLike, Contract } from "ethers";
import { defaultAbiCoder, keccak256, solidityPack } from "ethers/lib/utils";
import { DkimParams } from "unipass-wallet-dkim";
import {
  MasterKeySigGenerator,
  SessionKeySigGenerator,
  SignType,
} from "./sigGenerator";
import { GenerateSigType, Transaction } from "./transaction";

export class TxExcutor {
  constructor(
    public chainId: number,
    public nonce: number,
    public txs: Transaction[],
    public feeToken: BytesLike,
    public feeAmount: BigNumber,
    public feeReceiver: BytesLike,
    public signature: string | undefined = undefined
  ) {}

  public digestMessage(): string {
    return keccak256(
      solidityPack(
        ["uint256", "bytes32", "address", "uint256"],
        [
          this.chainId,
          keccak256(
            defaultAbiCoder.encode(
              [
                "uint256",
                "tuple(uint8 callType,uint256 gasLimit,address target,uint256 value,bytes data)[]",
              ],
              [this.nonce, this.txs]
            )
          ),
          this.feeToken,
          this.feeAmount,
        ]
      )
    );
  }

  public async generateSigByMasterKey(
    masterKeySigGenerator: MasterKeySigGenerator,
    signType: SignType
  ): Promise<TxExcutor> {
    this.signature = solidityPack(
      ["uint8", "bytes"],
      [
        GenerateSigType.SignByMasterKey,
        await masterKeySigGenerator.generateSignature(
          this.digestMessage(),
          signType
        ),
      ]
    );
    return this;
  }

  public async generateSigBySessionKey(
    sessionKeySigGenerator: SessionKeySigGenerator,
    signType: SignType
  ): Promise<TxExcutor> {
    this.signature = solidityPack(
      ["uint8", "bytes"],
      [
        GenerateSigType.SignBySessionKey,
        await sessionKeySigGenerator.generateSignature(
          this.digestMessage(),
          signType
        ),
      ]
    );
    return this;
  }

  public async generateSigByMasterKeyWithDkimParams(
    masterKeySigGenerator: MasterKeySigGenerator,
    signType: SignType,
    dkimParams: Map<string, DkimParams>
  ): Promise<TxExcutor> {
    this.signature = solidityPack(
      ["uint8", "bytes"],
      [
        GenerateSigType.SignBySessionKey,
        await masterKeySigGenerator.generateSignatureWithDkimParams(
          this.digestMessage(),
          signType,
          dkimParams
        ),
      ]
    );
    return this;
  }

  public generateSigBySigNone(): TxExcutor {
    this.signature = solidityPack(["uint8"], [GenerateSigType.SignNone]);
    return this;
  }

  public async execute(contract: Contract, gasLimit: BigNumber) {
    if (this.signature === undefined) {
      throw new Error(`expected generating signature`);
    }
    return contract.execute(
      this.txs,
      this.nonce,
      this.feeToken,
      this.feeReceiver,
      this.feeAmount,
      this.signature,
      { gasLimit }
    );
  }
}
