/* eslint-disable no-param-reassign */
import { getCreate2Address, hexlify, keccak256, randomBytes, solidityPack } from "ethers/lib/utils";
import { DkimParams } from "@unipasswallet/dkim";
import MailComposer from "nodemailer/lib/mail-composer";
import DKIM from "nodemailer/lib/dkim";
import { BigNumber, ethers, Signer, Wallet as WalletEOA } from "ethers";
import { EmailType } from "@unipasswallet/dkim-base";
import { Wallet, generateEmailSubject } from "@unipasswallet/wallet";
import {
  Keyset,
  KeyBase,
  KeySecp256k1Wallet,
  RoleWeight,
  SignType,
  KeyOpenIDWithEmail,
  KeyOpenIDSignType,
} from "@unipasswallet/keys";
import NodeRSA from "node-rsa";
import * as jose from "jose";

export const optimalGasLimit = ethers.constants.Two.pow(21);

export const OPENID_ISSUER = "unipass-wallet:test:issure";
export const OPENID_KID = "unipass-wallet:test:kid:0";
export const OPENID_AUDIENCE = "unipass-wallet:test:audience";

export enum Role {
  Owner,
  AssetsOp,
  Guardian,
}

function randomInt(max: number) {
  return Math.ceil(Math.random() * (max + 1));
}

export function randomKeyset(len: number, withDkim: boolean): Keyset {
  const ret: KeyBase[] = [];

  for (let i = 0; i < len; i++) {
    [Role.Owner, Role.AssetsOp, Role.Guardian].forEach((role) => {
      if (withDkim) {
        const random = randomInt(1);

        if (random === 0) {
          ret.push(
            new KeySecp256k1Wallet(
              WalletEOA.createRandom(),
              randomRoleWeight(role, len),
              randomInt(10) % 2 === 1 ? SignType.EIP712Sign : SignType.EthSign,
            ),
          );
        } else {
          const rand = randomInt(1);
          ret.push(
            new KeyOpenIDWithEmail({
              emailOptionsOrEmailHash: {
                type: "Raw",
                emailFrom: `${Buffer.from(randomBytes(10)).toString("hex")}@gmail.com`,
                pepper: hexlify(randomBytes(32)),
              },
              openIDOptionsOrOpenIDHash: {
                issuer: OPENID_ISSUER,
                sub: hexlify(randomBytes(8)),
              },
              roleWeight: randomRoleWeight(role, len),
              signType: rand === 0 ? KeyOpenIDSignType.EmailSign : KeyOpenIDSignType.OpenIDSign,
            }),
          );
        }
      } else {
        ret.push(
          new KeySecp256k1Wallet(
            WalletEOA.createRandom(),
            randomRoleWeight(role, len),
            randomInt(10) % 2 === 1 ? SignType.EIP712Sign : SignType.EthSign,
          ),
        );
      }
    });
  }

  return new Keyset(ret);
}

export function randomRoleWeight(role: Role, len: number): RoleWeight {
  const v = Math.ceil(100 / len);

  switch (role) {
    case Role.Owner: {
      return new RoleWeight(randomInt(50 - v) + v, 0, 0);
    }

    case Role.AssetsOp: {
      return new RoleWeight(0, randomInt(50 - v) + v, 0);
    }

    case Role.Guardian: {
      return new RoleWeight(0, 0, randomInt(50 - v) + v);
    }

    default: {
      throw new Error(`Invalid Role: ${role}`);
    }
  }
}

export async function selectKeys(
  wallet: Wallet,
  emailType: EmailType,
  digestHash: string,
  unipassPrivateKey: NodeRSA,
  role: Role,
  threshold: number,
): Promise<[Wallet, number[]]> {
  const indexes: number[] = [];
  let sum = 0;
  wallet.keyset.keys
    .map((v, i) => {
      let value;

      if (role === Role.Owner) {
        value = v.roleWeight.ownerWeight;
      } else if (role === Role.AssetsOp) {
        value = v.roleWeight.assetsOpWeight;
      } else if (role === Role.Guardian) {
        value = v.roleWeight.guardianWeight;
      } else {
        throw new Error(`Invalid Role: ${role}`);
      }

      return { index: i, value };
    })
    .sort((a, b) => b.value - a.value)
    .forEach((v) => {
      if (sum < threshold) {
        indexes.push(v.index);
        sum += v.value;
      }
    });
  const subject = generateEmailSubject(emailType, digestHash);
  const keys: KeyBase[] = await Promise.all(
    wallet.keyset.keys.map(async (key, i) => {
      if (indexes.includes(i)) {
        if (KeyOpenIDWithEmail.isKeyOpenIDWithEmail(key)) {
          if (key.signType === KeyOpenIDSignType.EmailSign && typeof key.emailOptionsOrEmailHash !== "string") {
            const dkimParams = await generateDkimParams(
              key.emailOptionsOrEmailHash.emailFrom,
              subject,
              unipassPrivateKey.exportKey("pkcs1"),
            );
            key = key.updateDkimParams(dkimParams);
          } else if (
            key.signType === KeyOpenIDSignType.OpenIDSign &&
            typeof key.openIDOptionsOrOpenIDHash !== "string"
          ) {
            const privateKey = await jose.importPKCS8(unipassPrivateKey.exportKey("pkcs8-pem"), "RS256");
            const idToken = await new jose.SignJWT({ nonce: digestHash })
              .setProtectedHeader({ alg: "RS256", kid: OPENID_KID })
              .setJti("Test 中文")
              .setIssuer(OPENID_ISSUER)
              .setAudience(OPENID_AUDIENCE)
              .setExpirationTime("2h")
              .setIssuedAt(Date.now() / 1000 - 300)
              .setSubject(key.openIDOptionsOrOpenIDHash.sub)
              .sign(privateKey);
            key = key.updateIDToken(idToken);
          }
        }
      }

      return key;
    }),
  );

  return [wallet.setKeyset(new Keyset(keys)), indexes];
}

export function getKeysetHash(keys: KeyBase[]): string {
  let keysetHash = "0x";
  keys.forEach((key) => {
    keysetHash = keccak256(solidityPack(["bytes", "bytes"], [keysetHash, key.serialize()]));
  });

  return keysetHash;
}

export function getProxyAddress(
  moduleMainAddress: string,
  dkimKeysAddress: string,
  factoryAddress: string,
  keysetHash: string,
): string {
  const code = ethers.utils.solidityPack(
    ["bytes", "uint256"],
    ["0x603a600e3d39601a805130553df3363d3d373d3d3d363d30545af43d82803e903d91601857fd5bf3", moduleMainAddress],
  );
  const codeHash = keccak256(code);
  const salt = keccak256(solidityPack(["bytes32", "address"], [keysetHash, dkimKeysAddress]));
  const expectedAddress = getCreate2Address(factoryAddress, salt, codeHash);

  return expectedAddress;
}

export async function getSignEmailWithDkim(subject: string, from: string, to: string, unipassPrivateKey: string) {
  const mail = new MailComposer({
    from,
    to,
    subject,
    html: "<b>Unipass Test</b>",
  });

  const dkim = new DKIM({
    keySelector: "s2055",
    domainName: "unipass.com",
    privateKey: unipassPrivateKey,
  });
  const email = await signEmailWithDkim(mail, dkim);

  return email;
}

export async function signEmailWithDkim(mail: MailComposer, dkim: DKIM) {
  const msg = await mail.compile().build();
  const signedMsg = dkim.sign(msg);
  let buff = "";

  // eslint-disable-next-line no-restricted-syntax
  for await (const chunk of signedMsg) {
    buff += chunk;
  }

  return buff;
}

export async function generateDkimParams(
  emailFrom: string,
  subject: string,
  unipassPrivateKey: string,
): Promise<DkimParams> {
  const email = await getSignEmailWithDkim(subject, emailFrom, "test@unipass.id.com", unipassPrivateKey);
  const dkims = await DkimParams.parseEmailParams(email, []);

  return dkims;
}

export async function transferEth(from: Signer, to: string, amount: BigNumber) {
  const ret = await (
    await from.sendTransaction({
      to,
      value: amount,
    })
  ).wait();

  return ret;
}
