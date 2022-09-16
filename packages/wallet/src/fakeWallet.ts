import { providers, BigNumber, Wallet as WalletEOA, Bytes, constants } from "ethers";
import { BytesLike, concat, hexlify, keccak256, randomBytes, toUtf8Bytes } from "ethers/lib/utils";
import { KeyEmailDkim, KeyERC1271, KeySecp256k1, KeySecp256k1Wallet, Keyset, SignType } from "@unipasswallet/keys";
import { Relayer } from "@unipasswallet/relayer";
import { moduleMainGasEstimator } from "@unipasswallet/abi";
import { unipassWalletContext, UnipassWalletContext } from "@unipasswallet/network";
import { DkimParamsBase, EmailType } from "@unipasswallet/dkim-base";
import { CallType, Transaction } from "@unipasswallet/transactions";
import { Wallet } from "./wallet";

export class FakeWallet extends Wallet {
  public readonly fakeKeyset: Keyset;

  constructor(
    address: string,
    keyset: Keyset,
    context: UnipassWalletContext = unipassWalletContext,
    bundleCreatation: boolean = true,
    public readonly rsaEncryptor?: (input: BytesLike) => Promise<string>,
    providerUrl?: string,
    relayer?: Relayer,
    creatationGasLimit?: BigNumber,
  ) {
    const provider = new providers.JsonRpcProvider(providerUrl);
    super({
      address,
      keyset,
      context,
      bundleCreatation,
      provider,
      relayer,
      creatationGasLimit,
    });
    this.fakeKeyset = new Keyset(
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
  }

  async feeOptions(walletAddress: string, ...transactions: Transaction[]): Promise<Transaction[]> {
    const ret = await Promise.all(
      transactions
        .filter(
          (transaction) =>
            !transaction.revertOnError &&
            !transaction.gasLimit.eq(constants.Zero) &&
            transaction.callType === CallType.Call,
        )
        .map(async (transaction) => {
          if (this.provider instanceof providers.JsonRpcProvider) {
            const tx = transaction;
            const params = [
              {
                from: walletAddress,
                to: tx.target,
                data: tx.data,
              },
              "latest",
              {
                [walletAddress]: {
                  code: moduleMainGasEstimator.bytecode,
                },
              },
            ];

            const result = await this.provider.send("eth_estimateGas", params);
            tx.gasLimit = BigNumber.from(result);

            return tx;
          }

          return Promise.reject(new Error("Expect JsonRpcProvider"));
        }),
    );

    return ret;
  }

  async signMessage(
    message: Bytes | string,
    signerIndexes: number[] = [],
    isDigest: boolean = true,
    emailType: EmailType = EmailType.None,
  ): Promise<string> {
    let parsedMessage = message;

    if (typeof parsedMessage === "string") {
      parsedMessage = toUtf8Bytes(parsedMessage);
    }
    const digestHash = isDigest ? hexlify(parsedMessage) : keccak256(parsedMessage);
    const signRet = await Promise.all(
      this.keyset.keys.map(async (key, index) => {
        if (signerIndexes.includes(index)) {
          if (KeyEmailDkim.isKeyEmailDkim(key)) {
            const from = `${hexlify(randomBytes(10)).slice(2)}@unipass.com`;
            const subject = generateEmailSubject(emailType, digestHash);
            const emailHeader =
              `from:${from}\r\n` +
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
              DkimParamsBase.create(emailType, from, digestHash, emailHeader, hexlify(dkimSig), "unipass.com", "s2055"),
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
