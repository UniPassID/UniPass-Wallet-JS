import { DkimParamsBase, pureEmailHash } from "unipass-wallet-dkim-base";
import { KeyType, RoleWeight } from ".";
import { KeyBase } from "./keyBase";
import { utils } from "ethers";

export class KeyEmailDkim extends KeyBase {
  constructor(
    public emailFrom: string,
    roleWeight: RoleWeight,
    public dkimParams?: DkimParamsBase
  ) {
    super(roleWeight);
    if (
      dkimParams !== undefined &&
      this.emailFrom !==
        Buffer.from(
          dkimParams.emailHeader.slice(
            dkimParams.fromLeftIndex,
            dkimParams.fromRightIndex + 1
          )
        ).toString()
    ) {
      throw new Error("Not Matched DkimParams With Email Address");
    }
  }

  public updateDkimParams(newDkimParams: DkimParamsBase): KeyEmailDkim {
    const emailFrom = Buffer.from(
      newDkimParams.emailHeader.slice(
        newDkimParams.fromLeftIndex,
        newDkimParams.fromRightIndex + 1
      )
    ).toString();
    if (this.emailFrom !== emailFrom) {
      throw new Error("Not Matched EmailFrom And DkimParams");
    }
    this.dkimParams = newDkimParams;
    return this;
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
        1,
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
        0,
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
