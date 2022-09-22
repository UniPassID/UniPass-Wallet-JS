import { getCreate2Address, hexlify, keccak256, randomBytes, solidityPack } from "ethers/lib/utils";
import { DkimParams } from "@unipasswallet/dkim";
import MailComposer from "nodemailer/lib/mail-composer";
import DKIM from "nodemailer/lib/dkim";
import { BigNumber, ethers, Signer, Wallet as WalletEOA } from "ethers";
import { EmailType } from "@unipasswallet/dkim-base";
import { Wallet, generateEmailSubject } from "@unipasswallet/wallet";
import { Keyset, KeyBase, KeyEmailDkim, KeySecp256k1Wallet, RoleWeight, SignType } from "@unipasswallet/keys";

export const optimalGasLimit = ethers.constants.Two.pow(21);

export enum Role {
  Owner,
  AssetsOp,
  Guardian,
}

function randomInt(max: number) {
  return Math.ceil(Math.random() * (max + 1));
}

export function randomKeyset(len: number): Keyset {
  const ret: KeyBase[] = [];

  for (let i = 0; i < len; i++) {
    [Role.Owner, Role.AssetsOp, Role.Guardian].forEach((role) => {
      const random = randomInt(1);

      if (random === 0) {
        ret.push(new KeySecp256k1Wallet(WalletEOA.createRandom(), randomRoleWeight(role, len), SignType.EthSign));
      } else {
        ret.push(
          new KeyEmailDkim(
            "Raw",
            `${Buffer.from(randomBytes(10)).toString("hex")}@unipass.com`,
            hexlify(randomBytes(32)),
            randomRoleWeight(role, len),
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
  unipassPrivateKey: string,
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
        if (KeyEmailDkim.isKeyEmailDkim(key) && key.type === "Raw") {
          const dkimParams = await generateDkimParams(key.emailFrom, subject, unipassPrivateKey);
          // eslint-disable-next-line no-param-reassign
          key.setDkimParams(dkimParams);
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
