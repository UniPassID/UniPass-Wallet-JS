import { defineReadOnly, keccak256, solidityPack, toUtf8Bytes } from "ethers/lib/utils";
import { DkimParamsBase, pureEmailHash } from "@unipasswallet/dkim-base";
import { obscureEmail } from "@unipasswallet/utils";
import { KeyType, RoleWeight, SignFlag } from ".";
import { KeyBase } from "./keyBase";
import { constants, utils } from "ethers";
import base64url from "base64url";

export type RequiredField<T, K extends keyof T> = T & Required<Pick<T, K>>;

export enum KeyOpenIDSignType {
  EmailSign = 1,
  OpenIDSign = 2,
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
  pepper: string;
  dkimParams?: DkimParamsBase;
  emailHash?: string;
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
        emailOptionsOrEmailHash.type === "Raw" &&
        emailOptionsOrEmailHash.dkimParams !== undefined &&
        emailOptionsOrEmailHash.emailFrom !==
          emailOptionsOrEmailHash.dkimParams.emailHeader.slice(
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
    let emailOptionsOrEmailHash: any;
    if (typeof obj.emailOptionsOrEmailHash === "string") {
      emailOptionsOrEmailHash = obj.emailOptionsOrEmailHash;
    } else {
      emailOptionsOrEmailHash = {
        ...obj.emailOptionsOrEmailHash,
        dkimParams: obj.dkimParams ? DkimParamsBase.fromJsonObj(obj.dkimParams) : undefined,
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
    const emailFrom = v.emailHeader.slice(v.fromLeftIndex, v.fromRightIndex + 1);

    if (typeof this.emailOptionsOrEmailHash === "string") {
      throw new Error("Please use email options but not hash");
    }

    if (this.emailOptionsOrEmailHash.type === "Raw" && this.emailOptionsOrEmailHash.emailFrom !== emailFrom) {
      throw new Error("Not Matched EmailFrom And DkimParams");
    }

    return new KeyOpenIDWithEmail({
      emailOptionsOrEmailHash: { ...this.emailOptionsOrEmailHash, dkimParams: v },
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
        if (this.emailOptionsOrEmailHash.type !== "Raw") {
          throw new Error("Expected Raw Inner");
        }

        if (this.emailOptionsOrEmailHash.dkimParams === undefined) {
          throw new Error("Expected DkimParams");
        }

        if (this.emailOptionsOrEmailHash.dkimParams!.digestHash !== digestHash) {
          throw new Error(`Expected subject ${this.emailOptionsOrEmailHash.dkimParams!.digestHash}, got ${digestHash}`);
        }

        return solidityPack(
          ["uint8", "uint8", "uint8", "bytes32", "bytes32", "bytes", "bytes"],
          [
            KeyType.OpenIDWithEmail,
            SignFlag.Sign,
            KeyOpenIDSignType.EmailSign,
            typeof this.openIDOptionsOrOpenIDHash === "string"
              ? this.openIDOptionsOrOpenIDHash
              : this.openIDOptionsOrOpenIDHash.openIDHash,
            this.emailOptionsOrEmailHash.pepper,
            this.emailOptionsOrEmailHash.dkimParams.serialize(),
            this.serializeRoleWeight(),
          ],
        );
      }
      case KeyOpenIDSignType.OpenIDSign: {
        if (typeof this.openIDOptionsOrOpenIDHash === "string") {
          throw new Error("Expect OpenID Options For OpenID Sign");
        }

        if (this.openIDOptionsOrOpenIDHash.idToken === undefined) {
          throw new Error("Expected Access Token");
        }

        const [headerBase64, payloadBase64, signatureBase64] = this.openIDOptionsOrOpenIDHash.idToken.split(".");
        const headerBuf = Buffer.from(headerBase64, "base64");
        const header = headerBuf.toString();
        const payloadBuf = Buffer.from(payloadBase64, "base64");
        const payload = payloadBuf.toString();
        const signature = Buffer.from(signatureBase64, "base64");

        const payloadObj = JSON.parse(payload);
        if (payloadObj.nonce !== digestHash) {
          throw new Error(`Expected subject ${payloadObj.nonce}, got ${digestHash}`);
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
            headerBuf.length,
            headerBuf,
            payloadBuf.length,
            payloadBuf,
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
}
