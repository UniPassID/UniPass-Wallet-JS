import { defineReadOnly, keccak256, solidityPack, toUtf8Bytes, toUtf8String } from "ethers/lib/utils";
import { DkimParamsBase, pureEmailHash } from "@unipasswallet/dkim-base";
import { obscureEmail } from "@unipasswallet/utils";
import { KeyType, RoleWeight, SignFlag } from ".";
import { KeyBase } from "./keyBase";
import { BigNumber, constants, utils } from "ethers";
import base64url from "base64url";

export type RequiredField<T, K extends keyof T> = T & Required<Pick<T, K>>;

export enum KeyOpenIDSignType {
  EmailSign = 1,
  OpenIDSign = 2,
}

export enum KeyEmailDkimSignType {
  RawEmail = 0,
  DkimZK = 1,
}

export interface KeyOpenIDWithEmailOptions {
  emailOptionsOrEmailHash?: KeyEmailOptions | string;
  openIDOptionsOrOpenIDHash?: OpenIDOptions | string;
  roleWeight: RoleWeight;
  signType?: KeyOpenIDSignType;
}

export interface KeyEmailOptions {
  type: "Raw" | "Hash";
  emailFrom: string;
  signType: KeyEmailDkimSignType;
  pepper: string;
  dkimParams?: DkimParamsBase;
  zkParams?: ZKParams;
  emailHash?: string;
}

export interface ZKParams {
  domainSize: BigNumber;
  publicInputs: string[];
  vkData: string[];
  proof: string[];
}

export interface OpenIDOptions {
  issuer?: string;
  sub?: string;
  idToken?: string;
  openIDHash?: string;
}

export class KeyOpenIDWithEmail extends KeyBase {
  public readonly emailOptionsOrEmailHash: RequiredField<KeyEmailOptions, "emailHash"> | string;

  public readonly openIDOptionsOrOpenIDHash: RequiredField<OpenIDOptions, "openIDHash" | "issuer" | "sub"> | string;

  public readonly roleWeight: RoleWeight;

  public readonly signType: KeyOpenIDSignType;

  public readonly keyHash: string;

  public readonly _isKeyOpenIDWithEmail: boolean;

  constructor(options: KeyOpenIDWithEmailOptions) {
    const {
      emailOptionsOrEmailHash = constants.HashZero,
      openIDOptionsOrOpenIDHash = constants.HashZero,
      roleWeight,
      signType = KeyOpenIDSignType.EmailSign,
    } = options;
    super(roleWeight);

    let emailHash: string;
    if (typeof emailOptionsOrEmailHash !== "string") {
      if (
        emailOptionsOrEmailHash.signType === KeyEmailDkimSignType.RawEmail &&
        emailOptionsOrEmailHash.type === "Raw" &&
        emailOptionsOrEmailHash.dkimParams !== undefined &&
        emailOptionsOrEmailHash.emailFrom !==
          toUtf8String(emailOptionsOrEmailHash.dkimParams.hexEmailHeader).slice(
            emailOptionsOrEmailHash.dkimParams.fromLeftIndex,
            emailOptionsOrEmailHash.dkimParams.fromRightIndex + 1,
          )
      ) {
        throw new Error("Not Matched DkimParams With Email Address");
      }

      switch (emailOptionsOrEmailHash.type) {
        case "Hash": {
          if (emailOptionsOrEmailHash.emailHash === undefined) {
            throw new Error("Expected hash for type `hash`");
          }
          emailHash = emailOptionsOrEmailHash.emailHash;
          break;
        }
        case "Raw": {
          emailHash = pureEmailHash(emailOptionsOrEmailHash.emailFrom, emailOptionsOrEmailHash.pepper);
          emailOptionsOrEmailHash.emailHash = emailHash;
          break;
        }
        default: {
          throw new Error("Unknown type");
        }
      }
    } else {
      if (signType === KeyOpenIDSignType.EmailSign) {
        throw new Error("Please use Email options When use Email to sign");
      }
      emailHash = emailOptionsOrEmailHash;
    }

    let openIDHash: string;
    if (typeof openIDOptionsOrOpenIDHash !== "string") {
      if (openIDOptionsOrOpenIDHash.idToken) {
        const [, payload] = openIDOptionsOrOpenIDHash.idToken.split(".");
        const payloadJson = JSON.parse(base64url.decode(payload));
        openIDOptionsOrOpenIDHash.issuer = payloadJson.iss!;
        openIDOptionsOrOpenIDHash.sub = payloadJson.sub!;
      }
      openIDHash = keccak256(
        solidityPack(
          ["bytes32", "bytes32"],
          [
            keccak256(toUtf8Bytes(openIDOptionsOrOpenIDHash.issuer)),
            keccak256(toUtf8Bytes(openIDOptionsOrOpenIDHash.sub)),
          ],
        ),
      );
      openIDOptionsOrOpenIDHash.openIDHash = openIDHash;
    } else {
      if (signType === KeyOpenIDSignType.OpenIDSign) {
        throw new Error("Please use OpenID options When use OpenID to sign");
      }
      openIDHash = openIDOptionsOrOpenIDHash;
    }

    this.keyHash = keccak256(solidityPack(["bytes32", "bytes32"], [emailHash, openIDHash]));
    this.openIDOptionsOrOpenIDHash =
      typeof openIDOptionsOrOpenIDHash === "string"
        ? openIDOptionsOrOpenIDHash
        : {
            ...openIDOptionsOrOpenIDHash,
            openIDHash: openIDOptionsOrOpenIDHash.openIDHash!,
            issuer: openIDOptionsOrOpenIDHash.issuer!,
            sub: openIDOptionsOrOpenIDHash.sub!,
          };
    this.emailOptionsOrEmailHash =
      typeof emailOptionsOrEmailHash === "string"
        ? emailOptionsOrEmailHash
        : {
            ...emailOptionsOrEmailHash,
            emailHash: emailOptionsOrEmailHash.emailHash!,
          };
    this.signType = signType;
    defineReadOnly(this, "_isKeyOpenIDWithEmail", true);
  }

  static isKeyOpenIDWithEmail(value: any): value is KeyOpenIDWithEmail {
    return !!(value && value._isKeyOpenIDWithEmail && RoleWeight.isRoleWeight(value.roleWeight));
  }

  public obscure(): KeyOpenIDWithEmail {
    if (typeof this.emailOptionsOrEmailHash !== "string" && this.emailOptionsOrEmailHash.type === "Raw") {
      const { emailOptionsOrEmailHash } = this;
      emailOptionsOrEmailHash.emailFrom = obscureEmail(this.emailOptionsOrEmailHash.emailFrom);
      emailOptionsOrEmailHash.pepper = "0x";
      emailOptionsOrEmailHash.type = "Hash";
      return new KeyOpenIDWithEmail({
        openIDOptionsOrOpenIDHash: this.openIDOptionsOrOpenIDHash,
        emailOptionsOrEmailHash: this.emailOptionsOrEmailHash,
        roleWeight: this.roleWeight,
      });
    }

    return this;
  }

  public toJson() {
    let emailOptionsOrEmailHash: any;
    if (typeof this.emailOptionsOrEmailHash === "string") {
      emailOptionsOrEmailHash = this.emailOptionsOrEmailHash;
    } else {
      emailOptionsOrEmailHash = {
        ...this.emailOptionsOrEmailHash,
        dkimParams: this.emailOptionsOrEmailHash.dkimParams
          ? this.emailOptionsOrEmailHash.dkimParams.toJsonObj()
          : undefined,
      };
    }
    return JSON.stringify({
      emailOptionsOrEmailHash,
      openIDOptionsOrOpenIDHash: this.openIDOptionsOrOpenIDHash,
      roleWeight: this.roleWeight,
      signType: this.signType,
    });
  }

  static fromJsonObj(obj: any): KeyOpenIDWithEmail {
    let emailOptionsOrEmailHash: string | KeyEmailOptions;
    if (typeof obj.emailOptionsOrEmailHash === "string") {
      emailOptionsOrEmailHash = obj.emailOptionsOrEmailHash;
    } else {
      emailOptionsOrEmailHash = {
        ...obj.emailOptionsOrEmailHash,
        dkimParams: obj.dkimParams ? DkimParamsBase.fromJsonObj(obj.dkimParams) : undefined,
        signType: obj.emailOptionsOrEmailHash.signType || KeyEmailDkimSignType.DkimZK,
      };
    }
    return new KeyOpenIDWithEmail({
      ...obj,
      emailOptionsOrEmailHash,
      roleWeight: RoleWeight.fromJsonObj(obj.roleWeight),
    });
  }

  public getDkimParams(): DkimParamsBase | undefined {
    if (typeof this.emailOptionsOrEmailHash !== "string") {
      return this.emailOptionsOrEmailHash.dkimParams;
    }
  }

  public updateDkimParams(v: DkimParamsBase): KeyOpenIDWithEmail {
    if (typeof this.emailOptionsOrEmailHash === "string") {
      throw new Error("Please use email options but not hash");
    }

    if (
      this.emailOptionsOrEmailHash.signType === KeyEmailDkimSignType.RawEmail &&
      this.emailOptionsOrEmailHash.type === "Raw" &&
      this.emailOptionsOrEmailHash.signType === KeyEmailDkimSignType.RawEmail &&
      this.emailOptionsOrEmailHash.emailFrom !==
        toUtf8String(v.hexEmailHeader).slice(v.fromLeftIndex, v.fromRightIndex + 1)
    ) {
      throw new Error("Not Matched EmailFrom And DkimParams");
    }

    return new KeyOpenIDWithEmail({
      emailOptionsOrEmailHash: { ...this.emailOptionsOrEmailHash, dkimParams: v },
      openIDOptionsOrOpenIDHash: this.openIDOptionsOrOpenIDHash,
      roleWeight: this.roleWeight,
      signType: this.signType,
    });
  }

  public updateEmailDkimSignType(signType: KeyEmailDkimSignType): KeyOpenIDWithEmail {
    if (typeof this.emailOptionsOrEmailHash === "string") {
      throw new Error("Please use email options but not hash");
    }

    return new KeyOpenIDWithEmail({
      emailOptionsOrEmailHash: { ...this.emailOptionsOrEmailHash, signType },
      openIDOptionsOrOpenIDHash: this.openIDOptionsOrOpenIDHash,
      roleWeight: this.roleWeight,
      signType: this.signType,
    });
  }

  public updateZKParams(zkParams: ZKParams): KeyOpenIDWithEmail {
    if (typeof this.emailOptionsOrEmailHash === "string") {
      throw new Error("Please use email options but not hash");
    }

    return new KeyOpenIDWithEmail({
      emailOptionsOrEmailHash: { ...this.emailOptionsOrEmailHash, zkParams },
      openIDOptionsOrOpenIDHash: this.openIDOptionsOrOpenIDHash,
      roleWeight: this.roleWeight,
      signType: this.signType,
    });
  }

  public updateIDToken(v: string): KeyOpenIDWithEmail {
    if (typeof this.openIDOptionsOrOpenIDHash === "string") {
      throw new Error("Please use email options but not hash");
    }

    return new KeyOpenIDWithEmail({
      emailOptionsOrEmailHash: this.emailOptionsOrEmailHash,
      openIDOptionsOrOpenIDHash: { idToken: v },
      roleWeight: this.roleWeight,
      signType: this.signType,
    });
  }

  public updateSignType(signType: KeyOpenIDSignType): KeyOpenIDWithEmail {
    if (typeof this.emailOptionsOrEmailHash === "string") {
      throw new Error("Please use email options but not hash");
    }

    return new KeyOpenIDWithEmail({
      emailOptionsOrEmailHash: this.emailOptionsOrEmailHash,
      openIDOptionsOrOpenIDHash: this.openIDOptionsOrOpenIDHash,
      roleWeight: this.roleWeight,
      signType,
    });
  }

  public async generateSignature(digestHash: string): Promise<string> {
    switch (this.signType) {
      case KeyOpenIDSignType.EmailSign: {
        if (typeof this.emailOptionsOrEmailHash === "string") {
          throw new Error("Expect Email Options For Email Sign");
        }

        if (this.emailOptionsOrEmailHash.dkimParams === undefined) {
          throw new Error("Expected DkimParams");
        }

        if (this.emailOptionsOrEmailHash.dkimParams!.digestHash !== digestHash) {
          throw new Error(`Expected subject ${this.emailOptionsOrEmailHash.dkimParams!.digestHash}, got ${digestHash}`);
        }

        switch (this.emailOptionsOrEmailHash.signType) {
          case KeyEmailDkimSignType.RawEmail: {
            if (this.emailOptionsOrEmailHash.type !== "Raw") {
              throw new Error("Expected Raw Inner");
            }
            return solidityPack(
              ["uint8", "uint8", "uint8", "bytes32", "uint8", "bytes", "bytes32", "bytes"],
              [
                KeyType.OpenIDWithEmail,
                SignFlag.Sign,
                KeyOpenIDSignType.EmailSign,
                typeof this.openIDOptionsOrOpenIDHash === "string"
                  ? this.openIDOptionsOrOpenIDHash
                  : this.openIDOptionsOrOpenIDHash.openIDHash,
                this.emailOptionsOrEmailHash.signType,
                this.emailOptionsOrEmailHash.dkimParams.serialize(),
                this.emailOptionsOrEmailHash.pepper,
                this.serializeRoleWeight(),
              ],
            );
          }
          case KeyEmailDkimSignType.DkimZK: {
            if (this.emailOptionsOrEmailHash.zkParams === undefined) {
              throw new Error("Expected ZK Params For ZK Sign");
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
                typeof this.openIDOptionsOrOpenIDHash === "string"
                  ? this.openIDOptionsOrOpenIDHash
                  : this.openIDOptionsOrOpenIDHash.openIDHash,
                this.emailOptionsOrEmailHash.signType,
                this.emailOptionsOrEmailHash.dkimParams.serialize(),
                this.emailOptionsOrEmailHash.zkParams.domainSize,
                this.emailOptionsOrEmailHash.zkParams.publicInputs.length,
                this.emailOptionsOrEmailHash.zkParams.publicInputs,
                this.emailOptionsOrEmailHash.zkParams.vkData.length,
                this.emailOptionsOrEmailHash.zkParams.vkData,
                this.emailOptionsOrEmailHash.zkParams.proof.length,
                this.emailOptionsOrEmailHash.zkParams.proof,
                this.serializeRoleWeight(),
              ],
            );
          }
          default: {
            throw new Error(`Invalid Key Email Sign Type: ${this.emailOptionsOrEmailHash.signType}`);
          }
        }
      }
      case KeyOpenIDSignType.OpenIDSign: {
        if (typeof this.openIDOptionsOrOpenIDHash === "string") {
          throw new Error("Expect OpenID Options For OpenID Sign");
        }

        if (this.openIDOptionsOrOpenIDHash.idToken === undefined) {
          throw new Error("Expected Access Token");
        }

        const [headerBase64, payloadBase64, signatureBase64] = this.openIDOptionsOrOpenIDHash.idToken.split(".");
        const header = base64url.toBuffer(headerBase64);
        const payload = base64url.toBuffer(payloadBase64);
        const signature = base64url.toBuffer(signatureBase64);

        const payloadObj = JSON.parse(payload.toString());
        if (payloadObj.nonce !== digestHash) {
          throw new Error(`Expected nonce ${payloadObj.nonce}, got ${digestHash}`);
        }

        const issLeftIndex = payload.indexOf('"iss":"') + 7;
        let issRightIndex = payload.indexOf('",', issLeftIndex);
        issRightIndex = issRightIndex >= 0 ? issRightIndex : payload.indexOf('"}', issLeftIndex);
        const kidLeftIndex = header.indexOf('"kid":"') + 7;
        let kidRightIndex = header.indexOf('",', kidLeftIndex);
        kidRightIndex = kidRightIndex >= 0 ? kidRightIndex : header.indexOf('"}', kidLeftIndex);

        const iatLeftIndex = payload.indexOf('"iat":') + 6;
        const expLeftIndex = payload.indexOf('"exp":') + 6;

        const subLeftIndex = payload.indexOf('"sub":"') + 7;
        let subRightIndex = payload.indexOf('",', subLeftIndex);
        subRightIndex = subRightIndex >= 0 ? subRightIndex : payload.indexOf('"}', subLeftIndex);

        const audLeftIndex = payload.indexOf('"aud":"') + 7;
        let audRightIndex = payload.indexOf('",', audLeftIndex);
        audRightIndex = audRightIndex >= 0 ? audRightIndex : payload.indexOf('"}', audLeftIndex);

        const nonceLeftIndex = payload.indexOf('"nonce":"') + 9;

        if (
          issLeftIndex < 7 ||
          issRightIndex < 0 ||
          kidLeftIndex < 7 ||
          kidRightIndex < 0 ||
          iatLeftIndex < 6 ||
          expLeftIndex < 6 ||
          subLeftIndex < 7 ||
          subRightIndex < 0 ||
          audLeftIndex < 7 ||
          audRightIndex < 0 ||
          nonceLeftIndex < 9
        ) {
          throw new Error(`Invalid ID Token: ${this.openIDOptionsOrOpenIDHash.idToken}`);
        }

        return solidityPack(
          [
            "uint8",
            "uint8",
            "uint8",
            "bytes32",
            "uint32",
            "uint32",
            "uint32",
            "uint32",
            "uint32",
            "uint32",
            "uint32",
            "uint32",
            "uint32",
            "uint32",
            "uint32",
            "uint32",
            "bytes",
            "uint32",
            "bytes",
            "uint32",
            "bytes",
            "bytes",
          ],
          [
            KeyType.OpenIDWithEmail,
            SignFlag.Sign,
            KeyOpenIDSignType.OpenIDSign,
            typeof this.emailOptionsOrEmailHash === "string"
              ? this.emailOptionsOrEmailHash
              : this.emailOptionsOrEmailHash.emailHash,
            issLeftIndex,
            issRightIndex,
            kidLeftIndex,
            kidRightIndex,
            subLeftIndex,
            subRightIndex,
            audLeftIndex,
            audRightIndex,
            nonceLeftIndex,
            iatLeftIndex,
            expLeftIndex,
            header.length,
            header,
            payload.length,
            payload,
            signature.length,
            signature,
            this.serializeRoleWeight(),
          ],
        );
      }
      default: {
        throw new Error(`Invalid Key OpenID SignType: ${this.signType}`);
      }
    }
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

  public keyType(): KeyType {
    return KeyType.OpenIDWithEmail;
  }
}
