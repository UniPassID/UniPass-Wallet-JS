import { BigNumber, BytesLike } from "ethers";
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
    public feeAmount: BigNumber
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

  public generateSigByMasterKey(
    masterKeySigGenerator: MasterKeySigGenerator,
    signType: SignType
  ): string {
    return solidityPack(
      ["uint8", "bytes"],
      [
        GenerateSigType.SignByMasterKey,
        masterKeySigGenerator.generateSignature(this.digestMessage(), signType),
      ]
    );
  }

  public async generateSigBySessionKey(
    sessionKeySigGenerator: SessionKeySigGenerator,
    signType: SignType
  ): Promise<string> {
    return solidityPack(
      ["uint8", "bytes"],
      [
        GenerateSigType.SignBySessionKey,
        await sessionKeySigGenerator.generateSignature(
          this.digestMessage(),
          signType
        ),
      ]
    );
  }

  public async generateSigByMasterKeyWithDkimParams(
    masterKeySigGenerator: MasterKeySigGenerator,
    signType: SignType,
    dkimParams: Map<string, DkimParams>
  ): Promise<string> {
    return solidityPack(
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
  }

  public static generateSigBySigNone(): string {
    return solidityPack(["uint8"], [GenerateSigType.SignNone]);
  }
}
