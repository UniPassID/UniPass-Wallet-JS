import {
  formatEther,
  hexlify,
  parseEther,
  randomBytes,
} from "ethers/lib/utils";
import { BigNumber, constants, Wallet as WalletEOA } from "ethers";
import {
  CallTxBuilder,
  UpdateKeysetHashTxBuilder,
  UpdateKeysetHashWithTimeLockTxBuilder,
} from "@unipasswallet/transaction-builders";
import { generateDkimParams, Role, selectKeys } from "./utils/common";
import { EmailType } from "@unipasswallet/dkim-base";
import { SessionKey, generateEmailSubject } from "@unipasswallet/wallet";
import { SignType } from "@unipasswallet/keys";

import {
  initTestContext,
  initWalletContext,
  TestContext,
  WalletContext,
} from "./utils/testContext";

describe("Test ModuleMain", () => {
  let context: TestContext;
  let walletContext: WalletContext;
  beforeAll(async () => {
    context = await initTestContext();
  });
  beforeEach(async () => {
    walletContext = await initWalletContext(context);
  });
  it("Updating KeysetHash Wighout TimeLock Should Success", async () => {
    const newKeysetHash = randomBytes(32);
    const txBuilder = await new UpdateKeysetHashTxBuilder(
      walletContext.wallet.address,
      walletContext.metaNonce,
      newKeysetHash,
      true
    );
    let signerIndexes: number[];
    [walletContext.wallet, signerIndexes] = await selectKeys(
      walletContext.wallet,
      EmailType.UpdateKeysetHash,
      txBuilder.digestMessage(),
      context.unipassPrivateKey.exportKey("pkcs1"),
      Role.Owner,
      100
    );
    const tx = (
      await txBuilder.generateSignature(walletContext.wallet, signerIndexes)
    ).build();

    const ret = await (await walletContext.wallet.sendTransaction([tx])).wait();
    expect(ret.status).toEqual(1);
    expect(await walletContext.wallet.getContract().getKeysetHash()).toEqual(
      hexlify(newKeysetHash)
    );
  });

  it("Updating KeysetHash With TimeLock Should Success", async () => {
    const newKeysetHash = Buffer.from(randomBytes(32));

    const txBuilder = await new UpdateKeysetHashWithTimeLockTxBuilder(
      walletContext.wallet.address,
      walletContext.metaNonce,
      newKeysetHash,
      true
    );

    const subject = txBuilder.digestMessage();
    let signerIndexes;
    [walletContext.wallet, signerIndexes] = await selectKeys(
      walletContext.wallet,
      EmailType.LockKeysetHash,
      subject,
      context.unipassPrivateKey.exportKey("pkcs1"),
      Role.Guardian,
      50
    );
    const tx = (
      await txBuilder.generateSignature(walletContext.wallet, signerIndexes)
    ).build();

    const ret = await (await walletContext.wallet.sendTransaction([tx])).wait();
    expect(ret.status).toEqual(1);
    const lockInfo = await walletContext.wallet.getContract().getLockInfo();
    expect(lockInfo.lockedKeysetHashRet).toEqual(
      `0x${newKeysetHash.toString("hex")}`
    );
  });

  it("Transfer ERC20 Should Success", async () => {
    const to = WalletEOA.createRandom();
    const data = walletContext.testERC20Token.interface.encodeFunctionData(
      "transfer",
      [to.address, 10]
    );
    const tx = new CallTxBuilder(
      true,
      constants.Zero,
      walletContext.testERC20Token.address,
      constants.Zero,
      data
    ).build();

    let sessionKey = new SessionKey(
      WalletEOA.createRandom(),
      SignType.EthSign,
      walletContext.wallet.address
    );
    const timestamp = Math.ceil(Date.now() / 1000) + 5000;
    const weight = 100;

    let signerIndexes;
    [walletContext.wallet, signerIndexes] = await selectKeys(
      walletContext.wallet,
      EmailType.CallOtherContract,
      sessionKey.digestPermitMessage(timestamp, weight),
      context.unipassPrivateKey.exportKey("pkcs1"),
      Role.AssetsOp,
      weight
    );

    sessionKey = await sessionKey.generatePermit(
      timestamp,
      weight,
      walletContext.wallet,
      signerIndexes
    );

    const ret = await (
      await walletContext.wallet.sendTransaction([tx], sessionKey)
    ).wait();
    expect(ret.status).toEqual(1);

    expect(await walletContext.testERC20Token.balanceOf(to.address)).toEqual(
      BigNumber.from(10)
    );
  });

  it("Transfer ETH Should Success", async () => {
    const to = WalletEOA.createRandom();
    const tx = new CallTxBuilder(
      true,
      constants.Zero,
      to.address,
      parseEther("10"),
      "0x"
    ).build();
    let sessionKey = new SessionKey(
      WalletEOA.createRandom(),
      SignType.EthSign,
      walletContext.wallet.address
    );

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
      weight
    );

    sessionKey = await sessionKey.generatePermit(
      timestamp,
      weight,
      walletContext.wallet,
      signerIndexes
    );

    const ret = await (
      await walletContext.wallet.sendTransaction([tx], sessionKey)
    ).wait();
    expect(ret.status).toEqual(1);
    expect(
      Number.parseInt(
        formatEther(await context.provider.getBalance(to.address)),
        10
      )
    ).toEqual(10);
  });

  it("Dkim Verify Should Success", async function () {
    const digestHash = constants.HashZero;
    const emailFrom = `${Buffer.from(randomBytes(10)).toString(
      "hex"
    )}@unipass.com`;
    const email = await generateDkimParams(
      emailFrom,
      generateEmailSubject(EmailType.CallOtherContract, digestHash),
       unipassPrivateKey
    );
    const pepper = hexlify(randomBytes(32));
    const ret = await dkimKeys.dkimVerify(pepper, 0, email.serialize());
    expect(ret[0]).toBe(true);
    expect(ret[1]).toBe(EmailType.CallOtherContract);
    expect(ret[2]).toBe(pureEmailHash(emailFrom, pepper));
    expect(ret[3]).toBe(hexlify(toUtf8Bytes(digestHash)));
  });

  // it("Update TimeLock During Should Success", async () => {
  //   const newDelay = 3600;
  //   const txBuilder = new UpdateTimeLockDuringTxBuilder(
  //     proxyModuleMain.address,
  //     metaNonce,
  //     newDelay,
  //     true
  //   );
  //   const subject = txBuilder.digestMessage();
  //   let signerIndexes;
  //   [wallet, signerIndexes] = await selectKeys(
  //     wallet,
  //     EmailType.UpdateTimeLockDuring,
  //     subject,
  //     unipassPrivateKey,
  //     Role.Owner,
  //     100
  //   );
  //   const tx = (
  //     await txBuilder.generateSignature(wallet, signerIndexes)
  //   ).build();
  //   const ret = await (
  //     await (
  //       await new TxExcutor(chainId, proxyModuleMain, nonce, [
  //         tx,
  //       ]).generateSignature([])
  //     ).execute(txParams)
  //   ).wait();

  //   expect(ret.status).toBe(1);
  //   const lockInfo = await proxyModuleMain.getLockInfo();
  //   expect(lockInfo.lockDuringRet).toEqual(newDelay);
  // });
  // it("Unlock KeysetHash TimeLock Should Success", async () => {
  //   // Step 1: Update TimeLock During
  //   const newTimelockDuring = 3;
  //   const txBuilder1 = new UpdateTimeLockDuringTxBuilder(
  //     proxyModuleMain.address,
  //     metaNonce,
  //     newTimelockDuring,
  //     true
  //   );
  //   let subject = txBuilder1.digestMessage();
  //   let signerIndexes;
  //   [wallet, signerIndexes] = await selectKeys(
  //     wallet,
  //     EmailType.UpdateTimeLockDuring,
  //     subject,
  //     unipassPrivateKey,
  //     Role.Owner,
  //     100
  //   );
  //   let tx = (
  //     await txBuilder1.generateSignature(wallet, signerIndexes)
  //   ).build();
  //   let ret = await await (
  //     await (
  //       await new TxExcutor(chainId, proxyModuleMain, nonce, [
  //         tx,
  //       ]).generateSignature([])
  //     ).execute(txParams)
  //   ).wait();

  //   expect(ret.status).toBe(1);
  //   let lockInfo = await proxyModuleMain.getLockInfo();
  //   expect(lockInfo.lockDuringRet).toEqual(newTimelockDuring);
  //   metaNonce++;
  //   nonce++;

  //   // Step 2: Update KeysetHash
  //   const newKeysetHash = Buffer.from(randomBytes(32));
  //   const txBuilder2 = new UpdateKeysetHashWithTimeLockTxBuilder(
  //     proxyModuleMain.address,
  //     metaNonce,
  //     newKeysetHash,
  //     true
  //   );
  //   subject = txBuilder2.digestMessage();
  //   [wallet, signerIndexes] = await selectKeys(
  //     wallet,
  //     EmailType.UpdateKeysetHash,
  //     subject,
  //     unipassPrivateKey,
  //     Role.Guardian,
  //     50
  //   );
  //   tx = (await txBuilder2.generateSignature(wallet, signerIndexes)).build();
  //   let txExecutor = await new TxExcutor(chainId, proxyModuleMain, nonce, [
  //     tx,
  //   ]).generateSignature([]);
  //   ret = await (
  //     await txExecutor.execute({ gasLimit: optimalGasLimit })
  //   ).wait();
  //   expect(ret.status).toEqual(1);
  //   lockInfo = await proxyModuleMain.getLockInfo();
  //   expect(lockInfo.lockedKeysetHashRet).toEqual(
  //     `0x${newKeysetHash.toString("hex")}`
  //   );
  //   metaNonce++;
  //   nonce++;

  //   // Step3 Unlock TimeLock
  //   tx = new UnlockKeysetHashTxBuilder(
  //     proxyModuleMain.address,
  //     metaNonce,
  //     true
  //   ).build();
  //   txExecutor = await new TxExcutor(chainId, proxyModuleMain, nonce, [
  //     tx,
  //   ]).generateSignature([]);

  //   try {
  //     await txExecutor.execute({ gasLimit: optimalGasLimit });
  //   } catch (error) {
  //     expect(JSON.parse(error.body).error.message).toEqual(
  //       `Error: VM Exception while processing transaction: reverted with custom error 'TxFailed("${txExecutor.digestMessage()}", "0x08c379a00000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000001e5f72657175697265546f556e4c6f636b3a20554e4c4f434b5f41465445520000")'`
  //     );
  //   }

  //   await new Promise((resolve) =>
  //     // eslint-disable-next-line no-promise-executor-return
  //     setTimeout(resolve, newTimelockDuring * 1000 + 1000)
  //   );

  //   ret = await (
  //     await txExecutor.execute({ gasLimit: optimalGasLimit })
  //   ).wait();
  //   expect(ret.status).toEqual(1);
  //   lockInfo = await proxyModuleMain.getLockInfo();
  //   expect(lockInfo.isLockedRet).toBe(false);
  //   expect(await proxyModuleMain.getKeysetHash()).toEqual(
  //     hexlify(newKeysetHash)
  //   );
  // });

  // it("Cancel KeysetHash TimeLock Should Success", async () => {
  //   // Step 1: Update KeysetHash
  //   const newKeysetHash = Buffer.from(randomBytes(32));
  //   const txBuilder1 = new UpdateKeysetHashWithTimeLockTxBuilder(
  //     proxyModuleMain.address,
  //     metaNonce,
  //     newKeysetHash,
  //     true
  //   );
  //   let subject = txBuilder1.digestMessage();
  //   let signerIndexes;
  //   [wallet, signerIndexes] = await selectKeys(
  //     wallet,
  //     EmailType.LockKeysetHash,
  //     subject,
  //     unipassPrivateKey,
  //     Role.Guardian,
  //     50
  //   );
  //   let tx = (
  //     await txBuilder1.generateSignature(wallet, signerIndexes)
  //   ).build();
  //   let txExecutor = await new TxExcutor(chainId, proxyModuleMain, nonce, [
  //     tx,
  //   ]).generateSignature([]);
  //   let ret = await (
  //     await txExecutor.execute({ gasLimit: optimalGasLimit })
  //   ).wait();
  //   expect(ret.status).toEqual(1);
  //   let lockInfo = await proxyModuleMain.getLockInfo();
  //   expect(lockInfo.lockedKeysetHashRet).toEqual(
  //     `0x${newKeysetHash.toString("hex")}`
  //   );
  //   metaNonce++;
  //   nonce++;

  //   // Step 2: Cancel TimeLock
  //   const txBuilder2 = await new CancelLockKeysetHashTxBuilder(
  //     proxyModuleMain.address,
  //     metaNonce,
  //     true
  //   );
  //   subject = txBuilder2.digestMessage();
  //   [wallet, signerIndexes] = await selectKeys(
  //     wallet,
  //     EmailType.CancelLockKeysetHash,
  //     subject,
  //     unipassPrivateKey,
  //     Role.Owner,
  //     1
  //   );
  //   tx = (await txBuilder2.generateSignature(wallet, signerIndexes)).build();

  //   txExecutor = await new TxExcutor(chainId, proxyModuleMain, nonce, [
  //     tx,
  //   ]).generateSignature([]);

  //   ret = await (
  //     await txExecutor.execute({ gasLimit: optimalGasLimit })
  //   ).wait();
  //   expect(ret.status).toEqual(1);
  //   lockInfo = await proxyModuleMain.getLockInfo();
  //   expect(lockInfo.isLockedRet).toBe(false);
  //   expect(await proxyModuleMain.getKeysetHash()).toEqual(constants.HashZero);
  // });

  // it("Update Implemenation Should Success", async () => {
  //   const Greeter = new ContractFactory(
  //     new Interface(GreeterArtifact.abi),
  //     GreeterArtifact.bytecode
  //   );
  //   const greeter = await deployer.deployContract(Greeter, 0, txParams);

  //   let ret = await (
  //     await whiteList
  //       .connect(whiteListAdmin)
  //       .updateImplementationWhiteList(greeter.address, true)
  //   ).wait();

  //   expect(ret.status).toEqual(1);

  //   const txBuilder = new UpdateImplementationTxBuilder(
  //     proxyModuleMain.address,
  //     metaNonce,
  //     greeter.address,
  //     true
  //   );
  //   const subject = txBuilder.digestMessage();
  //   let signerIndexes;
  //   [wallet, signerIndexes] = await selectKeys(
  //     wallet,
  //     EmailType.UpdateImplementation,
  //     subject,
  //     unipassPrivateKey,
  //     Role.Owner,
  //     100
  //   );

  //   const tx = (
  //     await txBuilder.generateSignature(wallet, signerIndexes)
  //   ).build();
  //   const txExecutor = await new TxExcutor(chainId, proxyModuleMain, nonce, [
  //     tx,
  //   ]).generateSignature([]);
  //   ret = await (
  //     await txExecutor.execute({ gasLimit: optimalGasLimit })
  //   ).wait();
  //   expect(ret.status).toEqual(1);
  //   proxyModuleMain = greeter.attach(proxyModuleMain.address);
  //   expect(await proxyModuleMain.ret1()).toEqual(BigNumber.from(1));
  //   metaNonce++;
  //   nonce++;
  // });

  // it("Sync Account Should Success", async () => {
  //   const newKeysetHash = Buffer.from(randomBytes(32));
  //   const newTimelockDuring = randomInt(100);
  //   const newImplementation = moduleMainUpgradable.address;
  //   metaNonce = 10;
  //   const txBuilder = new SyncAccountTxBuilder(
  //     proxyModuleMain.address,
  //     metaNonce,
  //     newKeysetHash,
  //     newTimelockDuring,
  //     newImplementation,
  //     true
  //   );
  //   const subject = txBuilder.digestMessage();
  //   let signerIndexes;
  //   [wallet, signerIndexes] = await selectKeys(
  //     wallet,
  //     EmailType.SyncAccount,
  //     subject,
  //     unipassPrivateKey,
  //     Role.Owner,
  //     100
  //   );
  //   const tx = (
  //     await txBuilder.generateSignature(wallet, signerIndexes)
  //   ).build();
  //   const txExecutor = await new TxExcutor(chainId, proxyModuleMain, nonce, [
  //     tx,
  //   ]).generateSignature([]);
  //   const ret = await (
  //     await txExecutor.execute({ gasLimit: optimalGasLimit })
  //   ).wait();
  //   expect(ret.status).toEqual(1);
  //   expect(await proxyModuleMain.getKeysetHash()).toEqual(
  //     `0x${newKeysetHash.toString("hex")}`
  //   );
  //   expect(await proxyModuleMain.getMetaNonce()).toEqual(
  //     BigNumber.from(metaNonce)
  //   );
  //   expect(await proxyModuleMain.getImplementation()).toEqual(
  //     newImplementation
  //   );
  //   const lockInfo = await proxyModuleMain.getLockInfo();
  //   expect(lockInfo.lockDuringRet).toEqual(newTimelockDuring);
  //   metaNonce++;
  //   nonce++;
  // });
});
