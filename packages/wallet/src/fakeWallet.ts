import { providers, Wallet as WalletEOA, Bytes, constants, BigNumber } from "ethers";
import { BytesLike, concat, defaultAbiCoder, hexlify, Interface, keccak256, toUtf8Bytes } from "ethers/lib/utils";
import { KeyEmailDkim, KeyERC1271, KeySecp256k1, KeySecp256k1Wallet, Keyset, SignType } from "@unipasswallet/keys";
import { Relayer } from "@unipasswallet/relayer";
import { moduleMainGasEstimator, gasEstimator, moduleMain } from "@unipasswallet/abi";
import { UnipassWalletContext } from "@unipasswallet/network";
import { DkimParamsBase, EmailType } from "@unipasswallet/dkim-base";
import { CallType, Transaction } from "@unipasswallet/transactions";
import { SignedTransactions, Wallet, WalletOptions } from "./wallet";

export interface FakeWalletOptions extends WalletOptions {
  address?: string;
  keyset: Keyset;
  context?: UnipassWalletContext;
  provider?: providers.JsonRpcProvider;
  relayer?: Relayer;
  rsaEncryptor?: (input: BytesLike) => Promise<string>;
  emailType: EmailType;
}

export class FakeWallet extends Wallet {
  public readonly fakeKeyset: Keyset;

  public readonly rsaEncryptor?: (input: BytesLike) => Promise<string>;

  public readonly emailType: EmailType;

  constructor(options: FakeWalletOptions) {
    super(options);
    this.fakeKeyset = FakeWallet.createFakeKeyset(options.keyset);
    this.emailType = options.emailType;
    this.rsaEncryptor = options.rsaEncryptor;
  }

  static createFakeKeyset(keyset: Keyset): Keyset {
    const fakeKeyset = new Keyset(
      keyset.keys.map((key) => {
        if (KeyERC1271.isKeyERC1271(key)) {
          throw new Error(`Cannot Create KeyERC1271`);
        }

        if (KeyEmailDkim.isKeyEmailDkim(key)) {
          return new KeyEmailDkim(key.emailFrom, key.pepper, key.roleWeight, key.getDkimParams());
        }

        if (KeySecp256k1.isKeySecp256k1(key) || KeySecp256k1Wallet.isKeySecp256k1Wallet(key)) {
          return new KeySecp256k1Wallet(WalletEOA.createRandom(), key.roleWeight, SignType.EthSign);
        }

        throw new Error(`Invalid Key: ${key}`);
      }),
    );

    return fakeKeyset;
  }

  options(): FakeWalletOptions {
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

  setEmailType(emailType: EmailType): FakeWallet {
    const options = this.options();
    options.emailType = emailType;
    return new FakeWallet(options);
  }

  async unipassEstimateGas(signedTransactions: SignedTransactions): Promise<BigNumber> {
    // let data;
    // if (isSignedTransactions(signedTransactions)) {
    //   data = new Interface(gasEstimator.abi).encodeFunctionData("estimate", [
    //     this.address,
    //     new Interface(moduleMain.abi).encodeFunctionData("execute", [
    //       signedTransactions.transactions,
    //       signedTransactions.nonce,
    //       signedTransactions.signature,
    //     ]),
    //   ]);
    // } else {
    //   data = new Interface(gasEstimator.abi).encodeFunctionData("estimate", [
    //     this.address,
    //     new Interface(moduleMain.abi).encodeFunctionData("execute", [signedTransactions.transactions, 0, "0x"]),
    //   ]);
    // }

    // const params = [
    //   {
    //     from: this.address,
    //     to: this.context.gasEstimator,
    //     data,
    //   },
    //   "latest",
    //   {
    //     [this.context.moduleMain]: {
    //       code: moduleMainGasEstimator.bytecode,
    //     },
    //     [this.context.moduleMainUpgradable]: {
    //       code: moduleMainGasEstimator.bytecode,
    //     },
    //   },
    // ];
    // const retBytes = await (this.provider as providers.JsonRpcProvider).send("eth_call", params);
    // const [, , gas] = defaultAbiCoder.decode(["bool", "bytes", "uint256"], retBytes);

    // return gas.add(this.txBaseCost(data));
    return constants.Zero;
  }

  async estimateGasLimits(...transactions: Transaction[]): Promise<Transaction[]> {
    const txs = transactions;
    if (this.provider instanceof providers.JsonRpcProvider) {
      const gasLimits = await Promise.all(
        [...txs.keys()].map(async (index) => {
          const data = new Interface(gasEstimator.abi).encodeFunctionData("estimate", [
            this.address,
            new Interface(moduleMain.abi).encodeFunctionData("execute", [transactions.slice(0, index), 0, "0x"]),
          ]);

          const params = [
            {
              from: this.address,
              to: this.context.gasEstimator,
              data,
            },
            "latest",
            {
              [this.context.moduleMain]: {
                code: moduleMainGasEstimator.bytecode,
              },
              [this.context.moduleMainUpgradable]: {
                code: moduleMainGasEstimator.bytecode,
              },
            },
          ];
          const retBytes = await (this.provider as providers.JsonRpcProvider).send("eth_call", params);
          const [, , gas] = defaultAbiCoder.decode(["bool", "bytes", "uint256"], retBytes);
          return gas;
        }),
      );

      gasLimits.reduce((pre, current, i) => {
        if (!txs[i].revertOnError && txs[i].gasLimit.eq(constants.Zero) && txs[i].callType === CallType.Call) {
          txs[i].gasLimit = current.sub(pre);
        }
        return current;
      }, 0);

      return txs;
    }

    return Promise.reject(new Error("Expect JsonRpcProvider"));
  }

  async signMessage(message: Bytes | string, signerIndexes: number[] = [], isDigest: boolean = true): Promise<string> {
    if (typeof message === "string") {
      throw new Error("expect message to be bytes");
    }
    const digestHash = isDigest ? hexlify(message) : keccak256(message);
    const signRet = await Promise.all(
      this.keyset.keys.map(async (key, index) => {
        if (signerIndexes.includes(index)) {
          if (KeyEmailDkim.isKeyEmailDkim(key)) {
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
                hexlify(dkimSig),
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

    return hexlify(concat(signRet));
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
