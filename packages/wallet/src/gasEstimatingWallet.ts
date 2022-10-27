/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
import { providers, Wallet as WalletEOA, Bytes, BigNumber, constants } from "ethers";
import { BytesLike, concat, getCreate2Address, hexlify, keccak256, solidityPack } from "ethers/lib/utils";
import { KeyEmailDkim, KeyERC1271, KeySecp256k1, KeySecp256k1Wallet, Keyset, SignType } from "@unipasswallet/keys";
import { Relayer } from "@unipasswallet/relayer";
import { unipassWalletContext, UnipassWalletContext } from "@unipasswallet/network";
import { EmailType } from "@unipasswallet/dkim-base";
import { toTransaction, Transaction } from "@unipasswallet/transactions";
import { CreationCode, SingletonFactoryAddress } from "@unipasswallet/utils";
import { BundledTransaction, ExecuteTransaction, Wallet, WalletOptions } from "./wallet";
import { SessionKey } from "./sessionKey";

export interface GasEstimatingWalletOptions extends WalletOptions {
  address?: string;
  keyset: Keyset;
  context?: UnipassWalletContext;
  provider?: providers.JsonRpcProvider;
  relayer?: Relayer;
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
      emailType: this.emailType,
    };
  }

  setEmailType(emailType: EmailType): GasEstimatingWallet {
    const options = this.options();
    options.emailType = emailType;
    return new GasEstimatingWallet(options);
  }

  setKeyset(keyset: Keyset): GasEstimatingWallet {
    const options = this.options();
    options.keyset = keyset;

    return new GasEstimatingWallet(options);
  }

  async estimateExecuteTxsGasLimits(txs: ExecuteTransaction, nonce: BigNumber): Promise<ExecuteTransaction> {
    let estimatedTxs;
    if (Array.isArray(txs.transactions)) {
      estimatedTxs = await this.estimateGasLimits(
        this.address,
        nonce,
        txs.sessionKeyOrSignerIndex,
        ...txs.transactions.map((v) => toTransaction(v)),
      );
    } else {
      estimatedTxs = await this.estimateGasLimits(
        this.address,
        nonce,
        txs.sessionKeyOrSignerIndex,
        toTransaction(txs.transactions),
      );
    }
    return { ...txs, gasLimit: estimatedTxs.total, transactions: estimatedTxs.txs };
  }

  async estimateBundledTxGasLimits(txs: BundledTransaction, nonce: BigNumber): Promise<BundledTransaction> {
    let estimatedTxs;
    if (Array.isArray(txs.transactions)) {
      const transactions = [];
      let innerNonce = nonce;
      let transaction;
      for (const tx of txs.transactions) {
        [transaction, innerNonce] = await this.toTransaction(tx, innerNonce);
        transactions.push(transaction);
      }
      estimatedTxs = await this.estimateGasLimits(this.context.moduleGuest, constants.Zero, [], ...transactions);
    } else {
      estimatedTxs = await this.estimateGasLimits(
        this.context.moduleGuest,
        nonce,
        [],
        (
          await this.toTransaction(txs.transactions)
        )[0],
      );
    }
    return { ...txs, gasLimit: estimatedTxs.total };
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
      let signature: string;
      if (to === this.address) {
        signature = (await this.signTransactions(transactions, signerIndexesOrSessionKey)).signature;
      } else {
        signature = "0x";
      }
      const total = await this.unipassEstimateGas(
        {
          address: to,
          transactions,
          nonce,
          signature,
        },
        overwrite,
      );

      return { txs, total };
    }
    return Promise.reject(new Error("Expect JsonRpcProvider"));
  }

  override async signPermit(digestHash: BytesLike, signerIndexer: number[]): Promise<string> {
    return hexlify(
      concat(
        await Promise.all(
          this.keyset.keys.map(async (key, index) => {
            if (signerIndexer.includes(index)) {
              if (KeyEmailDkim.isKeyEmailDkim(key)) {
                throw new Error("Cannot Estimate Gas For Transactions Signed By Email Key");
              }
              return key.generateSignature(digestHash);
            }

            return key.generateKey();
          }),
        ),
      ),
    );
  }

  override async signMessage(
    message: Bytes | string,
    signerIndexes: number[] | SessionKey = [],
    isDigest: boolean = true,
  ): Promise<string> {
    if (typeof message === "string") {
      throw new Error("expect message to be bytes");
    }
    const digestHash = isDigest ? hexlify(message) : keccak256(message);
    if (Array.isArray(signerIndexes)) {
      if (signerIndexes.length === 0) {
        return "0x";
      }
      const signRet = await Promise.all(
        this.keyset.keys.map(async (key, index) => {
          if (signerIndexes.includes(index)) {
            if (KeyEmailDkim.isKeyEmailDkim(key) && key.type === "Raw") {
              throw new Error("Cannot Sign Message By Email Key");
            }

            return key.generateSignature(digestHash);
          }

          return key.generateKey();
        }),
      );
      return solidityPack(["uint8", "bytes"], [0, concat(signRet)]);
    }
    const signRet = await signerIndexes.generateSignature(digestHash);
    return solidityPack(["uint8", "bytes"], [1, signRet]);
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