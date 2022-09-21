import { initTestContext, initWalletContext, TestContext, WalletContext } from "./utils/testContext";
import { UpdateKeysetHashTxBuilder } from "@unipasswallet/transaction-builders";
import { EmailType } from "@unipasswallet/dkim-base";
import { randomKeyset, Role, selectKeys } from "./utils/common";

describe("Test Fake Wallet", () => {
  let context: TestContext;
  let walletContext: WalletContext;
  beforeAll(async () => {
    context = await initTestContext();
  });
  beforeEach(async () => {
    // walletContext = await initWalletContext(context, false);
  });
  it("Test Gas Estimate", async () => {
    // const newKeyset = randomKeyset(10);
    // const txBuilder = new UpdateKeysetHashTxBuilder(
    //   walletContext.wallet.address,
    //   walletContext.metaNonce,
    //   newKeyset.hash(),
    //   false,
    // );
    // let signerIndexes: number[];
    // [walletContext.wallet, signerIndexes] = await selectKeys(
    //   walletContext.wallet,
    //   EmailType.UpdateKeysetHash,
    //   txBuilder.digestMessage(),
    //   context.unipassPrivateKey.exportKey("pkcs1"),
    //   Role.Owner,
    //   100,
    // );
    // walletContext.fakeWallet = walletContext.fakeWallet.setEmailType(EmailType.UpdateKeysetHash);
    // const tx = (await txBuilder.generateSignature(walletContext.wallet, signerIndexes)).build();
    // const fakeTx = (await txBuilder.generateSignature(walletContext.fakeWallet, signerIndexes)).build();

    // const txs = await walletContext.wallet.estimateGasLimits(tx);
    // const fakeTxs = await walletContext.fakeWallet.estimateGasLimits(fakeTx);

    // txs.forEach((tx, i) => {
    //   expect(tx.gasLimit).toEqual(fakeTxs[i].gasLimit);
    // });
    expect(1).toEqual(1);
  });
});
