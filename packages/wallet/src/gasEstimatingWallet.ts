import { providers, Wallet as WalletEOA, Bytes, BigNumber, constants } from "ethers";
import { BytesLike, concat, getCreate2Address, hexlify, keccak256, solidityPack, toUtf8Bytes } from "ethers/lib/utils";
import { KeyEmailDkim, KeyERC1271, KeySecp256k1, KeySecp256k1Wallet, Keyset, SignType } from "@unipasswallet/keys";
import { Relayer } from "@unipasswallet/relayer";
import { unipassWalletContext, UnipassWalletContext } from "@unipasswallet/network";
import { DkimParamsBase, EmailType } from "@unipasswallet/dkim-base";
import { CallType, Transaction } from "@unipasswallet/transactions";
import { CreationCode, SingletonFactoryAddress } from "@unipasswallet/utils";
import { Wallet, WalletOptions } from "./wallet";
import { SessionKey } from "./sessionKey";

export interface GasEstimatingWalletOptions extends WalletOptions {
  address?: string;
  keyset: Keyset;
  context?: UnipassWalletContext;
  provider?: providers.JsonRpcProvider;
  relayer?: Relayer;
  rsaEncryptor?: (input: BytesLike) => Promise<string>;
  emailType: EmailType;
}

export class GasEstimatingWallet extends Wallet {
  public readonly fakeKeyset: Keyset;

  public readonly rsaEncryptor?: (input: BytesLike) => Promise<string>;

  public readonly emailType: EmailType;

  constructor(options: GasEstimatingWalletOptions) {
    super(options);
    this.fakeKeyset = GasEstimatingWallet.createFakeKeyset(options.keyset);
    this.emailType = options.emailType;
    this.rsaEncryptor = options.rsaEncryptor;
  }

  static override create(options: GasEstimatingWalletOptions): GasEstimatingWallet {
    const createOptions = options;

    const { keyset, context = unipassWalletContext } = createOptions;

    if (!createOptions.address) {
      const address = getCreate2Address(
        SingletonFactoryAddress,
        keyset.hash(),
        keccak256(solidityPack(["bytes", "uint256"], [CreationCode, context.moduleMain])),
      );

      createOptions.address = address;
    }
    return new GasEstimatingWallet(createOptions);
  }

  static createFakeKeyset(keyset: Keyset): Keyset {
    const fakeKeyset = new Keyset(
      keyset.keys.map((key) => {
        if (KeyERC1271.isKeyERC1271(key)) {
          throw new Error(`Cannot Create KeyERC1271`);
        }

        if (KeyEmailDkim.isKeyEmailDkim(key)) {
          return new KeyEmailDkim(
            key.type,
            key.emailFrom,
            key.pepper,
            key.roleWeight,
            key.getDkimParams(),
            key.emailHash,
          );
        }

        if (KeySecp256k1.isKeySecp256k1(key) || KeySecp256k1Wallet.isKeySecp256k1Wallet(key)) {
          return new KeySecp256k1Wallet(WalletEOA.createRandom(), key.roleWeight, SignType.EthSign);
        }

        throw new Error(`Invalid Key: ${key}`);
      }),
    );

    return fakeKeyset;
  }

  options(): GasEstimatingWalletOptions {
    return {
      address: this.address,
      keyset: this.keyset,
      context: this.context,
      provider: this.provider === undefined ? undefined : (this.provider as providers.JsonRpcProvider),
      relayer: this.relayer,
      rsaEncryptor: this.rsaEncryptor,
      emailType: this.emailType,
    };
  }

  setEmailType(emailType: EmailType): GasEstimatingWallet {
    const options = this.options();
    options.emailType = emailType;
    return new GasEstimatingWallet(options);
  }

  async estimateGasLimits(
    to: string,
    nonce: BigNumber,
    signerIndexesOrSessionKey: number[] | SessionKey,
    ...transactions: Transaction[]
  ): Promise<{
    txs: Transaction[];
    total: BigNumber;
  }> {
    const txs = transactions;
    const overwrite = {
      [this.context.moduleMain]: {
        code: this.context.moduleMainGasEstimatorCode,
      },
      [this.context.moduleMainUpgradable]: {
        code: this.context.moduleMainUpgradableGasEstimatorCode,
      },
    };

    if (this.provider instanceof providers.JsonRpcProvider) {
      const gasLimits = await Promise.all(
        [...txs.keys(), txs.length].map(async (index) => {
          const transactions = txs.slice(0, index);
          const { signature } = await this.signTransactions(transactions, signerIndexesOrSessionKey);
          return this.unipassEstimateGas(
            {
              address: to,
              transactions,
              nonce,
              signature,
            },
            overwrite,
          );
        }),
      );

      const total = gasLimits[gasLimits.length - 1];

      gasLimits.reduce((pre, current, i) => {
        if (i > 0 && txs[i - 1].gasLimit.eq(constants.Zero) && txs[i - 1].callType === CallType.Call) {
          txs[i - 1].gasLimit = current.sub(pre);
        }
        return current;
      }, constants.Zero);

      return { txs, total };
    }
    return Promise.reject(new Error("Expect JsonRpcProvider"));
  }

  override async signMessage(
    message: Bytes | string,
    signerIndexes: number[] = [],
    isDigest: boolean = true,
  ): Promise<string> {
    if (typeof message === "string") {
      throw new Error("expect message to be bytes");
    }
    const digestHash = isDigest ? hexlify(message) : keccak256(message);
    if (signerIndexes.length === 0) {
      return "0x";
    }
    const signRet = await Promise.all(
      this.keyset.keys.map(async (key, index) => {
        if (signerIndexes.includes(index)) {
          if (KeyEmailDkim.isKeyEmailDkim(key) && key.type === "Raw") {
            const subject = generateEmailSubject(this.emailType, digestHash);
            const emailHeader =
              `from:${key.emailFrom}\r\n` +
              `subject:${subject}\r\n` +
              "date:Tue, 13 Sep 2022 10:39:25 +0000\r\n" +
              "message-id:<0aeef94e-3df2-ad88-d519-c7e578f9c043@unipass.com>\r\n" +
              "to:test@unipass.id.com\r\n" +
              "mime-version:1.0\r\n" +
              "content-type:text/html; charset=utf-8\r\n" +
              "content-transfer-encoding:7bit\r\n" +
              "dkim-signature:v=1; a=rsa-sha256; c=relaxed/relaxed; d=unipass.com; q=dns/txt; s=s2055; bh=KG9NOk7U9KUpsJvB9CDWzOWqDKp2k7AV9eKQJYKEc70=; h=from:subject:date:message-id:to:mime-version:content-type:content-transfer-encoding; b=";

            const dkimSig = await this.rsaEncryptor(toUtf8Bytes(emailHeader));

            key.setDkimParams(
              DkimParamsBase.create(
                this.emailType,
                key.emailFrom,
                digestHash,
                emailHeader,
                dkimSig,
                "unipass.com",
                "s2055",
              ),
            );
          }

          return key.generateSignature(digestHash);
        }

        return key.generateKey();
      }),
    );
    return solidityPack(["uint8", "bytes"], [0, concat(signRet)]);
  }
}

export function generateEmailSubject(emailType: EmailType, digestHash: string): string {
  switch (emailType) {
    case EmailType.UpdateKeysetHash: {
      return `UniPass-Update-Account-${digestHash}`;
    }

    case EmailType.LockKeysetHash: {
      return `UniPass-Start-Recovery-${digestHash}`;
    }

    case EmailType.CancelLockKeysetHash: {
      return `UniPass-Cancel-Recovery-${digestHash}`;
    }

    case EmailType.UpdateTimeLockDuring: {
      return `UniPass-Update-Timelock-${digestHash}`;
    }

    case EmailType.UpdateImplementation: {
      return `UniPass-Update-Implementation-${digestHash}`;
    }

    case EmailType.SyncAccount: {
      return `UniPass-Deploy-Account-${digestHash}`;
    }

    case EmailType.CallOtherContract: {
      return `UniPass-Call-Contract-${digestHash}`;
    }

    default: {
      throw new Error(`Invalid EmailType: ${emailType}`);
    }
  }
}
