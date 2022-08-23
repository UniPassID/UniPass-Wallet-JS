import { DkimParamsBase, pureEmailHash } from "unipass-wallet-dkim-base";
import { KeyType, RoleWeight, SignFlag } from ".";
import { KeyBase } from "./keyBase";
import { utils } from "ethers";

export class KeyEmailDkim extends KeyBase {
  constructor(
    public readonly emailFrom: string,
    roleWeight: RoleWeight,
    private dkimParams?: DkimParamsBase
  ) {
    super(roleWeight);
    if (
      this.dkimParams !== undefined &&
      this.emailFrom !==
        Buffer.from(
          this.dkimParams.emailHeader.slice(
            this.dkimParams.fromLeftIndex,
            this.dkimParams.fromRightIndex + 1
          )
        ).toString()
    ) {
      throw new Error("Not Matched DkimParams With Email Address");
    }
  }

  public toJson() {
    return JSON.stringify({
      emailFrom: this.emailFrom,
      roleWeight: this.roleWeight,
      dkimParams: this.dkimParams
        ? this.dkimParams.toDkimParamsBaseSerMiddler()
        : this.dkimParams,
    });
  }

  static fromJsonObj(obj: any): KeyEmailDkim {
    return new KeyEmailDkim(
      obj.emailFrom,
      obj.roleWeight,
      obj.dkimParams
        ? DkimParamsBase.fromDkimParamsBaseSerMiddler(obj.dkimParams)
        : obj.dkimParams
    );
  }

  public getDkimParams(): DkimParamsBase | undefined {
    return this.dkimParams;
  }

  public setDkimParams(v: DkimParamsBase) {
    const emailFrom = Buffer.from(
      v.emailHeader.slice(v.fromLeftIndex, v.fromRightIndex + 1)
    ).toString();
    if (this.emailFrom !== emailFrom) {
      throw new Error("Not Matched EmailFrom And DkimParams");
    }
    this.dkimParams = v;
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
