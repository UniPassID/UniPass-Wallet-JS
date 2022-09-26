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
import { generateDkimParams, randomKeyset, Role, selectKeys, transferEth } from "./utils/common";
import { EmailType, pureEmailHash } from "@unipasswallet/dkim-base";
import {
  SessionKey,
  generateEmailSubject,
  getWalletDeployTransaction,
  Wallet,
  ExecuteTransaction,
} from "@unipasswallet/wallet";
import { KeySecp256k1Wallet, Keyset, RoleWeight, SignType } from "@unipasswallet/keys";
import { digestTxHash } from "@unipasswallet/transactions";

import { initTestContext, initWalletContext, TestContext, WalletContext } from "./utils/testContext";
import { randomInt } from "crypto";

describe("Test Transactions", () => {
  let context: TestContext;
  let walletContext: WalletContext;
  beforeAll(async () => {
    context = await initTestContext();
  });
  beforeEach(async () => {
    walletContext = await initWalletContext(context, true);
  });
  it("Test IsValidSignature", async () => {
    let hash = randomBytes(32);
    let signerIndexes: number[];
    [walletContext.wallet, signerIndexes] = await selectKeys(
      walletContext.wallet,
      EmailType.CallOtherContract,
      hexlify(hash),
      context.unipassPrivateKey.exportKey("pkcs1"),
      Role.AssetsOp,
      100,
    );
    const sig = await walletContext.wallet.signMessage(hash, signerIndexes);
    expect(await walletContext.wallet.isValidSignature(hash, sig)).toEqual(true);
    hash = randomBytes(32);
    expect(await walletContext.wallet.isValidSignature(hash, sig)).toEqual(false);
  });
  it("Test DeployTx + SyncAccountTx + TransferTx", async () => {
    walletContext = await initWalletContext(context, false);
    const deployTx = getWalletDeployTransaction(context.unipassWalletContext, walletContext.wallet.keyset.hash());
    const newKeyset = randomKeyset(10);
    let signerIndexes: number[];
    const txBuilder = new SyncAccountTxBuilder(
      walletContext.wallet.address,
      10,
      newKeyset.hash(),
      10,
      context.moduleMainUpgradable.address,
      true,
    );
    [walletContext.wallet, signerIndexes] = await selectKeys(
      walletContext.wallet,
      EmailType.SyncAccount,
      txBuilder.digestMessage(),
      context.unipassPrivateKey.exportKey("pkcs1"),
      Role.Owner,
      100,
    );
    const syncAccountTx = (await txBuilder.generateSignature(walletContext.wallet, signerIndexes)).build();
    walletContext.wallet = walletContext.wallet.setKeyset(newKeyset);
    const to = WalletEOA.createRandom().address;
    const toValue = parseEther("0.001");
    const transferTx = new CallTxBuilder(true, constants.Zero, to, toValue, "0x").build();
    const digestHash = digestTxHash(context.chainId, walletContext.wallet.address, 2, [transferTx]);
    [walletContext.wallet, signerIndexes] = await selectKeys(
      walletContext.wallet,
      EmailType.CallOtherContract,
      digestHash,
      context.unipassPrivateKey.exportKey("pkcs1"),
      Role.AssetsOp,
      100,
    );
    const ret = await (
      await walletContext.wallet.sendTransaction({
        type: "Bundled",
        transactions: [
          deployTx,
          { type: "Execute", transactions: syncAccountTx, sessionKeyOrSignerIndex: [], gasLimit: constants.Zero },
          {
            type: "Execute",
            transactions: transferTx,
            sessionKeyOrSignerIndex: signerIndexes,
            gasLimit: constants.Zero,
          },
        ],
      })
    ).wait();
    expect(ret.status).toEqual(1);
    expect(await walletContext.wallet.getContract().getMetaNonce()).toEqual(BigNumber.from(10));
    expect(await walletContext.wallet.isSyncKeysetHash()).toEqual(true);
    expect(await context.provider.getBalance(to)).toEqual(toValue);
  });
  it("Test DeployTx + UpdateKeysetHashTx + TransferTx", async () => {
    walletContext = await initWalletContext(context, false);
    const deployTx = getWalletDeployTransaction(context.unipassWalletContext, walletContext.wallet.keyset.hash());
    const newKeysetHash = randomBytes(32);
    let signerIndexes: number[];
    const txBuilder = await new UpdateKeysetHashTxBuilder(
      walletContext.wallet.address,
      walletContext.metaNonce,
      newKeysetHash,
      true,
    );
    [walletContext.wallet, signerIndexes] = await selectKeys(
      walletContext.wallet,
      EmailType.UpdateKeysetHash,
      txBuilder.digestMessage(),
      context.unipassPrivateKey.exportKey("pkcs1"),
      Role.Owner,
      100,
    );
    const updateKeysetHashTx = (await txBuilder.generateSignature(walletContext.wallet, signerIndexes)).build();
    const to = WalletEOA.createRandom().address;
    const toValue = parseEther("0.001");
    const transferTx = new CallTxBuilder(true, constants.Zero, to, toValue, "0x").build();
    const digestHash = digestTxHash(context.chainId, walletContext.wallet.address, 2, [transferTx]);
    [walletContext.wallet, signerIndexes] = await selectKeys(
      walletContext.wallet,
      EmailType.CallOtherContract,
      digestHash,
      context.unipassPrivateKey.exportKey("pkcs1"),
      Role.AssetsOp,
      100,
    );
    const keyset = new Keyset([
      new KeySecp256k1Wallet(WalletEOA.createRandom(), new RoleWeight(100, 100, 100), SignType.EthSign),
    ]);
    const wallet = Wallet.create({
      keyset,
      context: context.unipassWalletContext,
      provider: context.provider,
      relayer: context.relayer,
    });
    await transferEth(
      new WalletEOA(process.env.HARDHAT_PRIVATE_KEY, context.provider),
      wallet.address,
      parseEther("10"),
    );
    await context.deployer.deployProxyContract(
      context.moduleMain.interface,
      context.moduleMain.address,
      keyset.hash(),
      context.txParams,
    );
    deployTx.revertOnError = true;
    console.log(await context.relayer.getNonce(walletContext.wallet.address));
    console.log(
      await walletContext.wallet
        .toTransaction(
          {
            type: "Execute",
            transactions: [updateKeysetHashTx],
            sessionKeyOrSignerIndex: [],
            gasLimit: constants.Zero,
          },
          await context.relayer.getNonce(walletContext.wallet.address),
        )
        .then((v) => v[0]),
    );
    const tx: ExecuteTransaction = {
      type: "Execute",
      transactions: [
        deployTx,
        await walletContext.wallet
          .toTransaction(
            {
              type: "Execute",
              transactions: [updateKeysetHashTx],
              sessionKeyOrSignerIndex: [],
              gasLimit: constants.Zero,
            },
            await context.relayer.getNonce(walletContext.wallet.address),
          )
          .then((v) => v[0]),
      ],
      sessionKeyOrSignerIndex: [0],
      gasLimit: constants.Zero,
    };
    const ret = await (await wallet.sendTransaction(tx)).wait();
    console.log(ret);
    expect(ret.status).toEqual(1);
    expect(await walletContext.wallet.getContract().getKeysetHash()).toEqual(hexlify(newKeysetHash));
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

    expect(await walletContext.wallet.isSyncKeysetHash()).toEqual(true);
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
    let signerIndexes: number[];
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
    const ret = await (await walletContext.wallet.sendTransaction([tx])).wait();
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
