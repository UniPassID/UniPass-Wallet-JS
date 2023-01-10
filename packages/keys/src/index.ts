import { BytesLike, utils, Wallet } from "ethers";

export * from "./keyBase";

export * from "./keySecp256k1";

export * from "./keySecp256k1Wallet";

export * from "./keyEmailDkim";

export * from "./keyOpenIDWithEmail";

export * from "./keyERC1271";

export * from "./roleWeight";

export * from "./keyset";

import { DkimParamsBase } from "@unipasswallet/dkim-base";
import { KeyEmailDkimSignType, ZKParams } from "./keyOpenIDWithEmail";
import { solidityPack } from "ethers/lib/utils";

export enum KeyType {
  Secp256k1 = 0,
  ERC1271Wallet = 1,
  OpenIDWithEmail = 2,
}

export enum SignType {
  EIP712Sign = 1,
  EthSign = 2,
}

export enum SignFlag {
  NotSign = 0,
  Sign = 1,
}

export async function ethSign(message: BytesLike, key: Wallet): Promise<string> {
  return key.signMessage(utils.arrayify(message));
}

export function eip712Sign(_hash: BytesLike, _key: Wallet): string {
  const sig = utils.joinSignature(_key._signingKey().signDigest(utils.arrayify(_hash)));

  return sig;
}

export async function sign(hash: BytesLike, key: Wallet, signType: SignType): Promise<string> {
  let sig;

  switch (signType) {
    case SignType.EIP712Sign: {
      sig = await eip712Sign(hash, key);
      break;
    }

    case SignType.EthSign: {
      sig = await ethSign(hash, key);
      break;
    }

    default: {
      const error: any = new Error(`Invalid SignTyp: ${signType}`);
      error.signType = signType;
      throw error;
    }
  }

  return utils.solidityPack(["bytes", "uint8"], [sig, signType]);
}

export function getDkimVerifyMessage(
  dkimParams: DkimParamsBase,
  emailSignType: KeyEmailDkimSignType,
  options: {
    zkParams?: ZKParams;
    pepper?: string;
  },
): string {
  switch (emailSignType) {
    case KeyEmailDkimSignType.RawEmail: {
      if (!options.pepper) {
        throw new Error("Expected Pepper For Raw Email");
      }
      return solidityPack(["uint8", "bytes", "bytes32"], [emailSignType, dkimParams.serialize(), options.pepper]);
    }
    case KeyEmailDkimSignType.DkimZK: {
      if (!options.zkParams) {
        throw new Error("Expected ZK Params For ZK Sign");
      }
      return solidityPack(
        ["uint8", "bytes", "uint128", "uint32", "uint256[]", "uint32", "uint256[]", "uint32", "uint256[]"],
        [
          emailSignType,
          dkimParams.serialize(),
          options.zkParams.domainSize,
          options.zkParams.publicInputs.length,
          options.zkParams.publicInputs,
          options.zkParams.vkData.length,
          options.zkParams.vkData,
          options.zkParams.proof.length,
          options.zkParams.proof,
        ],
      );
    }
    default: {
      throw new Error(`Invalid Key Email Sign Type: ${emailSignType}`);
    }
  }
}
