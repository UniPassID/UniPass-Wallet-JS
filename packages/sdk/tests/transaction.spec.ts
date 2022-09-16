import { formatEther, hexlify, parseEther, randomBytes, toUtf8Bytes } from "ethers/lib/utils";
import { BigNumber, constants, Wallet as WalletEOA } from "ethers";
import {
  CallTxBuilder,
  UpdateKeysetHashTxBuilder,
  UpdateKeysetHashWithTimeLockTxBuilder,
  UpdateTimeLockDuringTxBuilder,
  UnlockKeysetHashTxBuilder,
  CancelLockKeysetHashTxBuilder,
  UpdateImplementationTxBuilder,
  SyncAccountTxBuilder,
} from "@unipasswallet/transaction-builders";
import { generateDkimParams, Role, selectKeys } from "./utils/common";
import { EmailType, pureEmailHash } from "@unipasswallet/dkim-base";
import { SessionKey, generateEmailSubject } from "@unipasswallet/wallet";
import { SignType } from "@unipasswallet/keys";

import { initTestContext, initWalletContext, TestContext, WalletContext } from "./utils/testContext";
import { randomInt } from "crypto";

describe("Test ModuleMain", () => {
  [true, false].forEach((toDeploy) => {
    describe(`Test Transactions to Deploy is ${toDeploy}`, () => {
      let context: TestContext;
      let walletContext: WalletContext;
      beforeAll(async () => {
        context = await initTestContext();
      });
      beforeEach(async () => {
        walletContext = await initWalletContext(context, toDeploy);
      });
      it("Updating KeysetHash Wighout TimeLock Should Success", async () => {
        const newKeysetHash = randomBytes(32);
        const txBuilder = await new UpdateKeysetHashTxBuilder(
          walletContext.wallet.address,
          walletContext.metaNonce,
          newKeysetHash,
          true,
        );
        let signerIndexes: number[];
        [walletContext.wallet, signerIndexes] = await selectKeys(
          walletContext.wallet,
          EmailType.UpdateKeysetHash,
          txBuilder.digestMessage(),
          context.unipassPrivateKey.exportKey("pkcs1"),
          Role.Owner,
          100,
        );
        const tx = (await txBuilder.generateSignature(walletContext.wallet, signerIndexes)).build();

        expect(await walletContext.wallet.isSyncKeysetHash()).toEqual(toDeploy);
        const ret = await (await walletContext.wallet.sendTransaction([tx])).wait();
        expect(ret.status).toEqual(1);
        expect(await walletContext.wallet.getContract().getKeysetHash()).toEqual(hexlify(newKeysetHash));
        expect(await walletContext.wallet.isSyncKeysetHash()).toEqual(false);
      });

      it("Updating KeysetHash With TimeLock Should Success", async () => {
        const newKeysetHash = Buffer.from(randomBytes(32));

        const txBuilder = await new UpdateKeysetHashWithTimeLockTxBuilder(
          walletContext.wallet.address,
          walletContext.metaNonce,
          newKeysetHash,
          true,
        );

        const subject = txBuilder.digestMessage();
        let signerIndexes;
        [walletContext.wallet, signerIndexes] = await selectKeys(
          walletContext.wallet,
          EmailType.LockKeysetHash,
          subject,
          context.unipassPrivateKey.exportKey("pkcs1"),
          Role.Guardian,
          50,
        );
        const tx = (await txBuilder.generateSignature(walletContext.wallet, signerIndexes)).build();

        const ret = await (await walletContext.wallet.sendTransaction([tx])).wait();
        expect(ret.status).toEqual(1);
        const lockInfo = await walletContext.wallet.getContract().getLockInfo();
        expect(lockInfo.lockedKeysetHashRet).toEqual(`0x${newKeysetHash.toString("hex")}`);
      });

      it("Transfer ERC20 Should Success", async () => {
        const to = WalletEOA.createRandom();
        const data = walletContext.testERC20Token.interface.encodeFunctionData("transfer", [to.address, 10]);
        const tx = new CallTxBuilder(
          true,
          constants.Zero,
          walletContext.testERC20Token.address,
          constants.Zero,
          data,
        ).build();

        let sessionKey = new SessionKey(WalletEOA.createRandom(), SignType.EthSign, walletContext.wallet.address);
        const timestamp = Math.ceil(Date.now() / 1000) + 5000;
        const weight = 100;

        let signerIndexes;
        [walletContext.wallet, signerIndexes] = await selectKeys(
          walletContext.wallet,
          EmailType.CallOtherContract,
          sessionKey.digestPermitMessage(timestamp, weight),
          context.unipassPrivateKey.exportKey("pkcs1"),
          Role.AssetsOp,
          weight,
        );

        sessionKey = await sessionKey.generatePermit(timestamp, weight, walletContext.wallet, signerIndexes);

        const ret = await (await walletContext.wallet.sendTransaction([tx], sessionKey)).wait();
        expect(ret.status).toEqual(1);

        expect(await walletContext.testERC20Token.balanceOf(to.address)).toEqual(BigNumber.from(10));
      });

      it("Transfer ETH Should Success", async () => {
        const to = WalletEOA.createRandom();
        const tx = new CallTxBuilder(true, constants.Zero, to.address, parseEther("10"), "0x").build();
        let sessionKey = new SessionKey(WalletEOA.createRandom(), SignType.EthSign, walletContext.wallet.address);

        const timestamp = Math.ceil(Date.now() / 1000) + 5000;
        const weight = 100;

        const subject = sessionKey.digestPermitMessage(timestamp, weight);
        let signerIndexes;
        [walletContext.wallet, signerIndexes] = await selectKeys(
          walletContext.wallet,
          EmailType.CallOtherContract,
          subject,
          context.unipassPrivateKey.exportKey("pkcs1"),
          Role.AssetsOp,
          weight,
        );

        sessionKey = await sessionKey.generatePermit(timestamp, weight, walletContext.wallet, signerIndexes);

        const ret = await (await walletContext.wallet.sendTransaction([tx], sessionKey)).wait();
        expect(ret.status).toEqual(1);
        expect(Number.parseInt(formatEther(await context.provider.getBalance(to.address)), 10)).toEqual(10);
      });

      it("Dkim Verify Should Success", async function () {
        const digestHash = constants.HashZero;
        const emailFrom = `${Buffer.from(randomBytes(10)).toString("hex")}@unipass.com`;
        const email = await generateDkimParams(
          emailFrom,
          generateEmailSubject(EmailType.CallOtherContract, digestHash),
          context.unipassPrivateKey.exportKey("pkcs1"),
        );
        const pepper = hexlify(randomBytes(32));
        const ret = await context.dkimKeys.dkimVerify(pepper, 0, email.serialize());
        expect(ret[0]).toBe(true);
        expect(ret[1]).toBe(EmailType.CallOtherContract);
        expect(ret[2]).toBe(pureEmailHash(emailFrom, pepper));
        expect(ret[3]).toBe(hexlify(toUtf8Bytes(digestHash)));
      });

      it("Update TimeLock During Should Success", async () => {
        const newDelay = 3600;
        const txBuilder = new UpdateTimeLockDuringTxBuilder(
          walletContext.wallet.address,
          walletContext.metaNonce,
          newDelay,
          true,
        );
        const subject = txBuilder.digestMessage();
        let signerIndexes;
        [walletContext.wallet, signerIndexes] = await selectKeys(
          walletContext.wallet,
          EmailType.UpdateTimeLockDuring,
          subject,
          context.unipassPrivateKey.exportKey("pkcs1"),
          Role.Owner,
          100,
        );
        const tx = (await txBuilder.generateSignature(walletContext.wallet, signerIndexes)).build();

        const ret = await (await walletContext.wallet.sendTransaction([tx])).wait();
        expect(ret.status).toEqual(1);

        expect(ret.status).toBe(1);
        const lockInfo = await walletContext.wallet.getContract().getLockInfo();
        expect(lockInfo.lockDuringRet).toEqual(newDelay);
      });

      it("Unlock KeysetHash TimeLock Should Success", async () => {
        // Step 1: Update TimeLock During
        const newTimelockDuring = 3;
        const txBuilder1 = new UpdateTimeLockDuringTxBuilder(
          walletContext.wallet.address,
          walletContext.metaNonce,
          newTimelockDuring,
          true,
        );
        let subject = txBuilder1.digestMessage();
        let signerIndexes;
        [walletContext.wallet, signerIndexes] = await selectKeys(
          walletContext.wallet,
          EmailType.UpdateTimeLockDuring,
          subject,
          context.unipassPrivateKey.exportKey("pkcs1"),
          Role.Owner,
          100,
        );
        let tx = (await txBuilder1.generateSignature(walletContext.wallet, signerIndexes)).build();
        let ret = await (await walletContext.wallet.sendTransaction([tx])).wait();
        expect(ret.status).toEqual(1);

        let lockInfo = await walletContext.wallet.getContract().getLockInfo();
        expect(lockInfo.lockDuringRet).toEqual(newTimelockDuring);
        walletContext.metaNonce++;
        walletContext.nonce++;

        // Step 2: Update KeysetHash
        const newKeysetHash = Buffer.from(randomBytes(32));
        const txBuilder2 = new UpdateKeysetHashWithTimeLockTxBuilder(
          walletContext.wallet.address,
          walletContext.metaNonce,
          newKeysetHash,
          true,
        );
        subject = txBuilder2.digestMessage();
        [walletContext.wallet, signerIndexes] = await selectKeys(
          walletContext.wallet,
          EmailType.UpdateKeysetHash,
          subject,
          context.unipassPrivateKey.exportKey("pkcs1"),
          Role.Guardian,
          50,
        );
        tx = (await txBuilder2.generateSignature(walletContext.wallet, signerIndexes)).build();

        ret = await (await walletContext.wallet.sendTransaction([tx])).wait();
        expect(ret.status).toEqual(1);
        lockInfo = await walletContext.wallet.getContract().getLockInfo();
        expect(lockInfo.lockedKeysetHashRet).toEqual(`0x${newKeysetHash.toString("hex")}`);
        walletContext.metaNonce++;
        walletContext.nonce++;

        // Step3 Unlock TimeLock
        tx = new UnlockKeysetHashTxBuilder(walletContext.wallet.address, walletContext.metaNonce, true).build();

        await expect(walletContext.wallet.sendTransaction([tx])).rejects.toThrow();

        await new Promise((resolve) =>
          // eslint-disable-next-line no-promise-executor-return
          setTimeout(resolve, newTimelockDuring * 1000 + 1000),
        );

        ret = await (await walletContext.wallet.sendTransaction([tx])).wait();
        expect(ret.status).toEqual(1);
        lockInfo = await walletContext.wallet.getContract().getLockInfo();
        expect(lockInfo.isLockedRet).toBe(false);
        expect(await walletContext.wallet.getContract().getKeysetHash()).toEqual(hexlify(newKeysetHash));
      });

      it("Cancel KeysetHash TimeLock Should Success", async () => {
        // Step 1: Update KeysetHash
        const newKeysetHash = Buffer.from(randomBytes(32));
        const txBuilder1 = new UpdateKeysetHashWithTimeLockTxBuilder(
          walletContext.wallet.address,
          walletContext.metaNonce,
          newKeysetHash,
          true,
        );
        let subject = txBuilder1.digestMessage();
        let signerIndexes;
        [walletContext.wallet, signerIndexes] = await selectKeys(
          walletContext.wallet,
          EmailType.LockKeysetHash,
          subject,
          context.unipassPrivateKey.exportKey("pkcs1"),
          Role.Guardian,
          50,
        );
        let tx = (await txBuilder1.generateSignature(walletContext.wallet, signerIndexes)).build();

        let ret = await (await walletContext.wallet.sendTransaction([tx])).wait();
        expect(ret.status).toEqual(1);
        let lockInfo = await walletContext.wallet.getContract().getLockInfo();
        expect(lockInfo.lockedKeysetHashRet).toEqual(`0x${newKeysetHash.toString("hex")}`);
        walletContext.metaNonce++;
        walletContext.nonce++;

        // Step 2: Cancel TimeLock
        const txBuilder2 = await new CancelLockKeysetHashTxBuilder(
          walletContext.wallet.address,
          walletContext.metaNonce,
          true,
        );
        subject = txBuilder2.digestMessage();
        [walletContext.wallet, signerIndexes] = await selectKeys(
          walletContext.wallet,
          EmailType.CancelLockKeysetHash,
          subject,
          context.unipassPrivateKey.exportKey("pkcs1"),
          Role.Owner,
          1,
        );
        tx = (await txBuilder2.generateSignature(walletContext.wallet, signerIndexes)).build();

        ret = await (await walletContext.wallet.sendTransaction([tx])).wait();
        expect(ret.status).toEqual(1);
        lockInfo = await walletContext.wallet.getContract().getLockInfo();
        expect(lockInfo.isLockedRet).toBe(false);
        expect(await walletContext.wallet.getContract().getKeysetHash()).toEqual(constants.HashZero);
      });

      it("Update Implemenation Should Success", async () => {
        let ret = await (
          await context.whiteList
            .connect(context.whiteListAdmin)
            .updateImplementationWhiteList(walletContext.greeter.address, true)
        ).wait();

        expect(ret.status).toEqual(1);

        const txBuilder = new UpdateImplementationTxBuilder(
          walletContext.wallet.address,
          walletContext.metaNonce,
          walletContext.greeter.address,
          true,
        );
        const subject = txBuilder.digestMessage();
        let signerIndexes;
        [walletContext.wallet, signerIndexes] = await selectKeys(
          walletContext.wallet,
          EmailType.UpdateImplementation,
          subject,
          context.unipassPrivateKey.exportKey("pkcs1"),
          Role.Owner,
          100,
        );

        const tx = (await txBuilder.generateSignature(walletContext.wallet, signerIndexes)).build();
        ret = await (await walletContext.wallet.sendTransaction([tx])).wait();
        expect(ret.status).toEqual(1);
        const greeter = walletContext.greeter.attach(walletContext.wallet.address);
        expect(await greeter.ret1()).toEqual(BigNumber.from(1));
      });

      it("Sync Account Should Success", async () => {
        const newKeysetHash = Buffer.from(randomBytes(32));
        const newTimelockDuring = randomInt(100);
        const newImplementation = context.moduleMainUpgradable.address;
        const metaNonce = 10;
        const txBuilder = new SyncAccountTxBuilder(
          walletContext.wallet.address,
          metaNonce,
          newKeysetHash,
          newTimelockDuring,
          newImplementation,
          true,
        );
        const subject = txBuilder.digestMessage();
        let signerIndexes;
        [walletContext.wallet, signerIndexes] = await selectKeys(
          walletContext.wallet,
          EmailType.SyncAccount,
          subject,
          context.unipassPrivateKey.exportKey("pkcs1"),
          Role.Owner,
          100,
        );
        const tx = (await txBuilder.generateSignature(walletContext.wallet, signerIndexes)).build();

        const ret = await (await walletContext.wallet.sendTransaction([tx])).wait();
        expect(ret.status).toEqual(1);
        expect(await walletContext.wallet.getContract().getKeysetHash()).toEqual(`0x${newKeysetHash.toString("hex")}`);
        expect(await walletContext.wallet.getContract().getMetaNonce()).toEqual(BigNumber.from(metaNonce));
        expect(await walletContext.wallet.getContract().getImplementation()).toEqual(newImplementation);
        const lockInfo = await walletContext.wallet.getContract().getLockInfo();
        expect(lockInfo.lockDuringRet).toEqual(newTimelockDuring);
      });
    });
  });
});
