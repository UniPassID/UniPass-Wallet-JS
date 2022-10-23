/* eslint-disable no-param-reassign */
import { initTestContext, initWalletContext, TestContext, WalletContext } from "./utils/testContext";
import {
  BaseTxBuilder,
  CallTxBuilder,
  CancelLockKeysetHashTxBuilder,
  SyncAccountTxBuilder,
  UnlockKeysetHashTxBuilder,
  UpdateKeysetHashTxBuilder,
  UpdateKeysetHashWithTimeLockTxBuilder,
  UpdateTimeLockDuringTxBuilder,
} from "@unipasswallet/transaction-builders";
import { EmailType } from "@unipasswallet/dkim-base";
import { moduleMain } from "@unipasswallet/abi";
import { Interface, parseEther } from "ethers/lib/utils";
import { BigNumber, constants, Contract, Wallet } from "ethers";
import { randomKeyset, Role, selectKeys } from "./utils/common";
import { Transaction, digestTxHash } from "@unipasswallet/transactions";

describe("Test Gas Estimating Wallet", () => {
  let context: TestContext;
  let walletContext: WalletContext;
  const difference: BigInt = BigInt(5000);
  const gasEstimator = async (
    txBuilder: BaseTxBuilder,
    emailType: EmailType,
    role: Role,
    weight: number,
    context: TestContext,
    walletContext: WalletContext,
  ) => {
    let estimatedTx: {
      txs: Transaction[];
      total: BigNumber;
    };
    let executeSignerIndexes: number[];
    if (txBuilder instanceof UnlockKeysetHashTxBuilder) {
      const tx = txBuilder.build();
      estimatedTx = await walletContext.fakeWallet.estimateGasLimits(
        walletContext.fakeWallet.address,
        BigNumber.from(walletContext.nonce),
        executeSignerIndexes,
        tx,
      );
      executeSignerIndexes = [];
    } else if (txBuilder instanceof CallTxBuilder) {
      const tx = txBuilder.build();

      [walletContext.wallet, executeSignerIndexes] = await selectKeys(
        walletContext.wallet,
        emailType,
        digestTxHash(context.chainId, walletContext.wallet.address, walletContext.nonce, [tx]),
        context.unipassPrivateKey.exportKey("pkcs1"),
        role,
        weight,
      );
      walletContext.fakeWallet = walletContext.fakeWallet.setEmailType(emailType);
      estimatedTx = await walletContext.fakeWallet.estimateGasLimits(
        walletContext.fakeWallet.address,
        BigNumber.from(walletContext.nonce),
        executeSignerIndexes,
        tx,
      );
      let newExecuteSignerIndexes: number[];
      [walletContext.wallet, newExecuteSignerIndexes] = await selectKeys(
        walletContext.wallet,
        emailType,
        digestTxHash(context.chainId, walletContext.wallet.address, walletContext.nonce, estimatedTx.txs),
        context.unipassPrivateKey.exportKey("pkcs1"),
        role,
        weight,
      );
      expect(executeSignerIndexes).toEqual(newExecuteSignerIndexes);
    } else {
      let signerIndexes: number[];
      [walletContext.wallet, signerIndexes] = await selectKeys(
        walletContext.wallet,
        emailType,
        txBuilder.digestMessage(),
        context.unipassPrivateKey.exportKey("pkcs1"),
        role,
        weight,
      );
      walletContext.fakeWallet = walletContext.fakeWallet.setEmailType(emailType);
      const tx = (await txBuilder.generateSignature(walletContext.wallet, signerIndexes)).build();
      estimatedTx = await walletContext.fakeWallet.estimateGasLimits(
        walletContext.fakeWallet.address,
        BigNumber.from(walletContext.nonce),
        executeSignerIndexes,
        tx,
      );
      executeSignerIndexes = [];
    }

    const signedTxs = await walletContext.wallet.signTransactions(estimatedTx.txs, executeSignerIndexes);

    const receipt = await (
      await new Contract(signedTxs.address, new Interface(moduleMain.abi), context.deployer.signer).execute(
        signedTxs.transactions,
        signedTxs.nonce,
        signedTxs.signature,
      )
    ).wait();

    expect(receipt.status).toEqual(1);
    const realGas = receipt.gasUsed.toBigInt();

    expect(estimatedTx.total.toBigInt()).toBeGreaterThan(realGas);
    expect(estimatedTx.total.toBigInt()).toBeLessThan(realGas + difference);

    console.log(estimatedTx.total.toBigInt() - realGas);
  };
  beforeAll(async () => {
    context = await initTestContext();
  });
  beforeEach(async () => {
    walletContext = await initWalletContext(context, true);
  });
  it("Test Update KeysetHash Transactions Gas Estimate", async () => {
    const newKeyset = randomKeyset(10);
    const txBuilder = new UpdateKeysetHashTxBuilder(
      walletContext.wallet.address,
      walletContext.metaNonce,
      newKeyset.hash(),
      true,
    );
    await gasEstimator(txBuilder, EmailType.UpdateKeysetHash, Role.Owner, 100, context, walletContext);
    expect(await walletContext.wallet.getContract().getKeysetHash()).toEqual(newKeyset.hash());
  });

  it("Test Cancel Recovery Gas Estimate", async () => {
    const newKeyset = randomKeyset(10);
    let txBuilder: BaseTxBuilder = new UpdateKeysetHashWithTimeLockTxBuilder(
      walletContext.wallet.address,
      walletContext.metaNonce,
      newKeyset.hash(),
      true,
    );
    await gasEstimator(txBuilder, EmailType.LockKeysetHash, Role.Guardian, 50, context, walletContext);
    walletContext.nonce++;
    walletContext.metaNonce++;
    const contract = walletContext.wallet.getContract();
    const lockInfo = await contract.getLockInfo();
    expect(lockInfo.lockedKeysetHashRet).toEqual(newKeyset.hash());

    txBuilder = new CancelLockKeysetHashTxBuilder(walletContext.wallet.address, walletContext.metaNonce, true);
    await gasEstimator(txBuilder, EmailType.CancelLockKeysetHash, Role.Owner, 1, context, walletContext);
    expect((await contract.getNonce()).toNumber()).toEqual(walletContext.nonce);
    expect((await contract.getMetaNonce()).toNumber()).toEqual(walletContext.metaNonce);
  });

  it("Test Finish Recovery Gas Estimate", async () => {
    const contract = walletContext.wallet.getContract();
    let txBuilder: BaseTxBuilder = new UpdateTimeLockDuringTxBuilder(
      walletContext.wallet.address,
      walletContext.metaNonce,
      3,
      true,
    );
    await gasEstimator(txBuilder, EmailType.UpdateTimeLockDuring, Role.Owner, 100, context, walletContext);
    walletContext.nonce++;
    walletContext.metaNonce++;
    let lockInfo = await contract.getLockInfo();
    expect(lockInfo.lockDuringRet).toEqual(3);

    const newKeyset = randomKeyset(10);
    txBuilder = new UpdateKeysetHashWithTimeLockTxBuilder(
      walletContext.wallet.address,
      walletContext.metaNonce,
      newKeyset.hash(),
      true,
    );
    await gasEstimator(txBuilder, EmailType.LockKeysetHash, Role.Guardian, 50, context, walletContext);
    walletContext.nonce++;
    walletContext.metaNonce++;
    lockInfo = await contract.getLockInfo();
    expect(lockInfo.lockedKeysetHashRet).toEqual(newKeyset.hash());

    await new Promise((resolve) => {
      setTimeout(resolve, 10000);
    });

    txBuilder = new UnlockKeysetHashTxBuilder(walletContext.wallet.address, walletContext.metaNonce, true);
    await gasEstimator(txBuilder, EmailType.CancelLockKeysetHash, Role.Owner, 1, context, walletContext);
    expect(await contract.getKeysetHash()).toEqual(newKeyset.hash());
    expect((await contract.getNonce()).toNumber()).toEqual(walletContext.nonce);
    expect((await contract.getMetaNonce()).toNumber()).toEqual(walletContext.metaNonce);
  });

  it("Test Sync Account Gas Estimate", async () => {
    const contract = walletContext.wallet.getContract();
    walletContext.metaNonce = 3;
    const newKeyset = randomKeyset(10);
    const txBuilder: BaseTxBuilder = new SyncAccountTxBuilder(
      walletContext.wallet.address,
      walletContext.metaNonce,
      newKeyset.hash(),
      3,
      context.moduleMain.address,
      true,
    );
    await gasEstimator(txBuilder, EmailType.SyncAccount, Role.Owner, 100, context, walletContext);
    const lockInfo = await contract.getLockInfo();
    expect(lockInfo.lockDuringRet).toEqual(3);

    expect(await contract.getKeysetHash()).toEqual(newKeyset.hash());
    expect((await contract.getNonce()).toNumber()).toEqual(walletContext.nonce);
    expect((await contract.getMetaNonce()).toNumber()).toEqual(walletContext.metaNonce);
  });

  it("Test Transfer Eth Gas Estimate", async () => {
    const contract = walletContext.wallet.getContract();
    const to = Wallet.createRandom().connect(context.provider);
    const txBuilder: BaseTxBuilder = new CallTxBuilder(true, constants.Zero, to.address, parseEther("0.01"), "0x");
    await gasEstimator(txBuilder, EmailType.CallOtherContract, Role.AssetsOp, 100, context, walletContext);

    expect((await contract.getNonce()).toNumber()).toEqual(walletContext.nonce);

    expect((await to.getBalance()).toBigInt()).toEqual(parseEther("0.01").toBigInt());
  });
});
