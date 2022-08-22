import { DkimParamsBase, pureEmailHash } from "unipass-wallet-dkim-base";
import { KeyType, RoleWeight, SignFlag } from ".";
import { KeyBase } from "./keyBase";
import { utils } from "ethers";

export class KeyEmailDkim extends KeyBase {
  constructor(
    private _emailFrom: string,
    roleWeight: RoleWeight,
    private _dkimParams?: DkimParamsBase
  ) {
    super(roleWeight);
    if (
      _dkimParams !== undefined &&
      this._emailFrom !==
        Buffer.from(
          _dkimParams.emailHeader.slice(
            _dkimParams.fromLeftIndex,
            _dkimParams.fromRightIndex + 1
          )
        ).toString()
    ) {
      throw new Error("Not Matched DkimParams With Email Address");
    }
  }

  public get emailFrom(): string {
    return this._emailFrom;
  }

  public set emailFrom(v: string) {
    if (this._emailFrom !== v) {
      this._dkimParams = undefined;
    }
    this.emailFrom = v;
  }

  public get dkimParams(): DkimParamsBase | undefined {
    return this._dkimParams;
  }

  public set dkimParams(v: DkimParamsBase) {
    const emailFrom = Buffer.from(
      v.emailHeader.slice(v.fromLeftIndex, v.fromRightIndex + 1)
    ).toString();
    if (this.emailFrom !== emailFrom) {
      throw new Error("Not Matched EmailFrom And DkimParams");
    }
    this._dkimParams = v;
  }

  public async generateSignature(digestHash: string): Promise<string> {
    if (this.dkimParams === undefined) {
      throw new Error("Expected DkimParams");
    }
    const subject = [
      this.dkimParams.subjectPadding,
      this.dkimParams.subject.join(""),
    ]
      .join("")
      .toString();
    if (subject !== digestHash) {
      throw new Error(`Expected subject ${subject}, got ${digestHash}`);
    }
    return utils.solidityPack(
      ["uint8", "uint8", "uint32", "bytes", "bytes", "bytes"],
      [
        KeyType.EmailDkim,
        SignFlag.Sign,
        this.emailFrom.length,
        Buffer.from(this.emailFrom, "utf-8"),
        this.dkimParams.serialize(),
        this.serializeRoleWeight(),
      ]
    );
  }

  public generateKey(): string {
    return utils.solidityPack(
      ["uint8", "uint8", "uint32", "bytes", "bytes"],
      [
        KeyType.EmailDkim,
        SignFlag.NotSign,
        this.emailFrom.length,
        Buffer.from(this.emailFrom, "utf-8"),
        this.serializeRoleWeight(),
      ]
    );
  }

  public serialize(): string {
    return utils.solidityPack(
      ["uint8", "bytes32", "bytes"],
      [
        KeyType.EmailDkim,
        pureEmailHash(this.emailFrom),
        this.serializeRoleWeight(),
      ]
    );
  }
}
