import { BytesLike, defineReadOnly, hexlify, keccak256, solidityPack, toUtf8String } from "ethers/lib/utils";
import { DkimParamsBase, pureEmailHash } from "@unipasswallet/dkim-base";
import { obscureEmail } from "@unipasswallet/utils";
import { KeyType, RoleWeight, SignFlag } from ".";
import { KeyBase } from "./keyBase";
import { constants, utils } from "ethers";
import { KeyEmailDkimSignType, KeyOpenIDSignType, ZKParams } from "./keyOpenIDWithEmail";

export class KeyEmailDkim extends KeyBase {
  public readonly _isKeyEmailDkim: boolean;

  public readonly emailHash: string;

  public readonly pepper: string;

  public readonly keyHash: string;

  constructor(
    public readonly type: "Raw" | "Hash",
    public readonly emailFrom: string,
    _pepper: BytesLike,
    roleWeight: RoleWeight,
    private dkimParams?: DkimParamsBase,
    hash?: string,
    public readonly emailSignType: KeyEmailDkimSignType = KeyEmailDkimSignType.DkimZK,
    public readonly zkParams?: ZKParams,
  ) {
    super(roleWeight);

    if (
      type === "Raw" &&
      dkimParams !== undefined &&
      emailSignType === KeyEmailDkimSignType.RawEmail &&
      emailFrom !==
        toUtf8String(dkimParams.hexEmailHeader).slice(dkimParams.fromLeftIndex, dkimParams.fromRightIndex + 1)
    ) {
      throw new Error("Not Matched DkimParams With Email Address");
    }

    this.pepper = hexlify(_pepper);

    switch (type) {
      case "Hash": {
        if (hash === undefined) {
          throw new Error("Expected hash for type `hash`");
        }
        this.emailHash = hash;
        this.keyHash = keccak256(solidityPack(["bytes32", "bytes32"], [this.emailHash, constants.HashZero]));
        break;
      }
      case "Raw": {
        this.emailHash = pureEmailHash(emailFrom, _pepper);
        this.keyHash = keccak256(solidityPack(["bytes32", "bytes32"], [this.emailHash, constants.HashZero]));
        break;
      }
      default: {
        throw new Error("Unknown type");
      }
    }
    defineReadOnly(this, "_isKeyEmailDkim", true);
  }

  static isKeyEmailDkim(value: any): value is KeyEmailDkim {
    return !!(value && value._isKeyEmailDkim && RoleWeight.isRoleWeight(value.roleWeight));
  }

  public obscure(): KeyEmailDkim {
    if (this.type !== "Raw") {
      throw new Error("Expect type Raw");
    }

    return new KeyEmailDkim(
      "Hash",
      obscureEmail(this.emailFrom),
      "0x",
      this.roleWeight,
      this.dkimParams,
      this.emailHash,
      this.emailSignType,
    );
  }

  public toJson() {
    return JSON.stringify({
      type: this.type,
      pepper: this.pepper,
      emailFrom: this.emailFrom,
      emailHash: this.emailHash,
      roleWeight: this.roleWeight.toJsonObj(),
      dkimParams: this.dkimParams ? this.dkimParams.toJsonObj() : this.dkimParams,
      emailSignType: this.emailSignType,
    });
  }

  static fromJsonObj(obj: any): KeyEmailDkim {
    return new KeyEmailDkim(
      obj.type,
      obj.emailFrom,
      obj.pepper,
      RoleWeight.fromJsonObj(obj.roleWeight),
      obj.dkimParams ? DkimParamsBase.fromJsonObj(obj.dkimParams) : obj.dkimParams,
      obj.emailHash,
      obj.emailSignType || KeyEmailDkimSignType.DkimZK,
    );
  }

  public getDkimParams(): DkimParamsBase | undefined {
    return this.dkimParams;
  }

  public setDkimParams(v: DkimParamsBase) {
    const emailFrom = toUtf8String(v.hexEmailHeader).slice(v.fromLeftIndex, v.fromRightIndex + 1);

    if (this.type === "Raw" && this.emailFrom !== emailFrom) {
      throw new Error("Not Matched EmailFrom And DkimParams");
    }
    this.dkimParams = v;
  }

  public updateDkimParams(v: DkimParamsBase): KeyEmailDkim {
    if (this.emailSignType === KeyEmailDkimSignType.RawEmail && this.type === "Raw") {
      const emailFrom = toUtf8String(v.hexEmailHeader).slice(v.fromLeftIndex, v.fromRightIndex + 1);
      if (emailFrom !== this.emailFrom) {
        throw new Error(`Unmatched EmailFrom[${this.emailFrom}] With EmailFrom[${emailFrom}] in the dkim Pramams`);
      }
    }
    return new KeyEmailDkim(
      this.type,
      this.emailFrom,
      this.pepper,
      this.roleWeight,
      v,
      this.keyHash,
      this.emailSignType,
      this.zkParams,
    );
  }

  public async generateSignature(digestHash: string): Promise<string> {
    if (this.type !== "Raw") {
      throw new Error("Expected Raw Inner");
    }

    if (this.dkimParams!.digestHash !== digestHash) {
      throw new Error(`Expected subject ${this.dkimParams!.digestHash}, got ${digestHash}`);
    }

    switch (this.emailSignType) {
      case KeyEmailDkimSignType.DkimZK: {
        if (this.zkParams === undefined) {
          throw new Error("Expected ZK Params");
        }
        return solidityPack(
          [
            "uint8",
            "uint8",
            "uint8",
            "bytes32",
            "uint8",
            "bytes",
            "uint128",
            "uint32",
            "uint256[]",
            "uint32",
            "uint256[]",
            "uint32",
            "uint256[]",
            "bytes",
          ],
          [
            KeyType.OpenIDWithEmail,
            SignFlag.Sign,
            KeyOpenIDSignType.EmailSign,
            constants.HashZero,
            this.emailSignType,
            this.dkimParams.serialize(),
            this.zkParams.domainSize,
            this.zkParams.publicInputs.length,
            this.zkParams.publicInputs,
            this.zkParams.vkData.length,
            this.zkParams.vkData,
            this.zkParams.proof.length,
            this.zkParams.proof,
            this.serializeRoleWeight(),
          ],
        );
      }
      case KeyEmailDkimSignType.RawEmail: {
        if (this.dkimParams === undefined) {
          throw new Error("Expected DkimParams");
        }
        return utils.solidityPack(
          ["uint8", "uint8", "uint8", "bytes32", "uint8", "bytes", "bytes32", "bytes"],
          [
            KeyType.OpenIDWithEmail,
            SignFlag.Sign,
            KeyOpenIDSignType.EmailSign,
            constants.HashZero,
            this.emailSignType,
            this.dkimParams.serialize(),
            this.pepper,
            this.serializeRoleWeight(),
          ],
        );
      }
      default: {
        throw new Error(`Unknown emailSignType: ${this.emailSignType}`);
      }
    }
  }

  public keyType(): KeyType {
    return KeyType.OpenIDWithEmail;
  }

  public updateZKParams(zkParams: ZKParams): KeyEmailDkim {
    return new KeyEmailDkim(
      this.type,
      this.emailFrom,
      this.pepper,
      this.roleWeight,
      this.dkimParams,
      this.keyHash,
      this.emailSignType,
      zkParams,
    );
  }

  public updateEmailSignType(emailSignType: KeyEmailDkimSignType): KeyEmailDkim {
    return new KeyEmailDkim(
      this.type,
      this.emailFrom,
      this.pepper,
      this.roleWeight,
      this.dkimParams,
      this.keyHash,
      emailSignType,
      this.zkParams,
    );
  }

  public generateKey(): string {
    return utils.solidityPack(
      ["uint8", "uint8", "bytes32", "bytes"],
      [KeyType.OpenIDWithEmail, SignFlag.NotSign, this.keyHash, this.serializeRoleWeight()],
    );
  }

  public serialize(): string {
    return utils.solidityPack(
      ["uint8", "bytes32", "bytes"],
      [KeyType.OpenIDWithEmail, this.keyHash, this.serializeRoleWeight()],
    );
  }
}
