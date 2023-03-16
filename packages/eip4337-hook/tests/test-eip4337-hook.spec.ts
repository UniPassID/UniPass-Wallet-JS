import { providers, Wallet as EOAWallet, BigNumber } from "ethers";
import { parseEther } from "ethers/lib/utils";
import * as dotenv from "dotenv";
import { KeySecp256k1Wallet, Keyset, RoleWeight, SignType } from "@unipasswallet/keys";
import { TESTNET_UNIPASS_WALLET_CONTEXT } from "@unipasswallet/network";
import { Wallet } from "@unipasswallet/wallet";
import { RpcRelayer } from "@unipasswallet/relayer";
import fetchPonyfill from "fetch-ponyfill";
import {
  getAddEIP4337HookTransaction,
  getRemoveEIP4337HookTransaction,
  getSigSize,
  isAddEIP4337Hook,
  needAddEIP4337Hook,
  sendEIP4337HookTransaction,
  simulateEIP4337HookTransaction,
} from "../src/utils";
import { HttpRpcClient } from "@account-abstraction/sdk";
import { UnipassAccountAPI } from "../src/unipassAccountApi";
import { VerifyingPaymasterAPI } from "../src/verifyingPaymasterAPI";
import { CallTxBuilder } from "@unipasswallet/transaction-builders";

describe("Test EIP4337 Hook", () => {
  let ENTRY_POINT;
  let BUNDLER_URL;
  let EIP4337WALLET_PRIVATE_KEY;
  let PAYMASTER_URL;
  let RELAYER_URL;
  let RPC_URL;
  beforeAll(() => {
    dotenv.config({ path: `${__dirname}/../../../.env` });
    ENTRY_POINT = process.env.ENTRY_POINT!;
    BUNDLER_URL = process.env.BUNDLER_URL!;
    EIP4337WALLET_PRIVATE_KEY = process.env.EIP4337WALLET_PRIVATE_KEY!;
    PAYMASTER_URL = process.env.PAYMASTER_URL!;
    RELAYER_URL = process.env.RELAYER_URL!;
    RPC_URL = process.env.RPC_URL!;
  });
  it("Test Transfer", async () => {
    const provider = new providers.JsonRpcProvider(RPC_URL);
    const config = {
      chainId: await provider.getNetwork().then((net) => net.chainId),
      entryPointAddress: ENTRY_POINT,
      bundlerUrl: BUNDLER_URL,
    };

    const keyset = new Keyset([
      new KeySecp256k1Wallet(new EOAWallet(EIP4337WALLET_PRIVATE_KEY), new RoleWeight(100, 100, 100), SignType.EthSign),
    ]);

    const wallet = new Wallet({
      address: "0x4135D76d2DD1291258BDbE681bb4b82655eB0E5a",
      keyset,
      relayer: new RpcRelayer(RELAYER_URL, TESTNET_UNIPASS_WALLET_CONTEXT, provider),
      provider,
    });

    const { chainId } = await provider.getNetwork();

    const walletAPI = new UnipassAccountAPI({
      provider,
      entryPointAddress: config.entryPointAddress,
      accountAddress: "0x4135D76d2DD1291258BDbE681bb4b82655eB0E5a",
      wallet,
      paymasterAPI: new VerifyingPaymasterAPI(chainId, getSigSize(wallet.keyset, [0]), PAYMASTER_URL, ENTRY_POINT),
      overheads: {
        sigSize: getSigSize(wallet.keyset, [0]),
      },
    });
    const tx = new CallTxBuilder(
      true,
      BigNumber.from(0),
      "0x93f2e90Ab182E445E66a8523B57B3443cb0f1fC2",
      parseEther("0.001"),
      "0x",
    ).build();
    console.log(
      await needAddEIP4337Hook({
        userAddr: wallet.address,
        provider,
        impl: "0xf956a5cce43dbcaa57d8b9b23ddea4bcb79b3e87",
        chain: 5,
        fetch: fetchPonyfill().fetch,
        paymasterUrl: PAYMASTER_URL,
      }),
    );
    const op = await simulateEIP4337HookTransaction(walletAPI, tx);
    const client = new HttpRpcClient(config.bundlerUrl, config.entryPointAddress, config.chainId);
    const uoHash = await sendEIP4337HookTransaction(client, walletAPI, op);
    const txHash = await walletAPI.getUserOpReceipt(uoHash);
    console.log("tx hash: ", txHash);
  });
  it("Test add hook", async () => {
    const addr = "0x4135D76d2DD1291258BDbE681bb4b82655eB0E5a";
    const provider = new providers.JsonRpcProvider(RPC_URL);
    const tx = await getRemoveEIP4337HookTransaction(addr, provider);
    console.log("tx", tx);
    const isAddHook = await isAddEIP4337Hook(addr, provider, "0xf956a5cce43dbcaa57d8b9b23ddea4bcb79b3e87");
    console.log(isAddHook);
    console.log(await getAddEIP4337HookTransaction(addr, provider, "0xf956a5cce43dbcaa57d8b9b23ddea4bcb79b3e87"));
  });
});
