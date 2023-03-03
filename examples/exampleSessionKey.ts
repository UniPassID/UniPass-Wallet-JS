// eslint-disable-next-line import/no-extraneous-dependencies
import { Wallet as WalletEOA, constants, providers } from "ethers";
// eslint-disable-next-line import/no-extraneous-dependencies
import { parseEther } from "ethers/lib/utils";

import { CallTxBuilder } from "@unipass-wallet.js/transaction-builders";
import UnipassWalletProvider from "@unipass-wallet.js/provider";
import { RawMainExecuteCall, SessionKey, Wallet } from "@unipass-wallet.js/wallet";
import { Keyset, SignType } from "@unipass-wallet.js/keys";
import { RpcRelayer } from "@unipass-wallet.js/relayer";
import { MAINNET_UNIPASS_WALLET_CONTEXT } from "@unipass-wallet.js/network";

async function main() {
  const provider = UnipassWalletProvider.getInstance();
  const wallet = await provider.wallet();

  // Application Side Perpare for session key
  const sessionKeyWallet = WalletEOA.createRandom();
  const timestamp = Math.ceil(Date.now() / 1000) + 5000;

  // Got Permit From Unipass
  const permit = await provider.generatePermit(sessionKeyWallet.address, timestamp);

  const sessionKey = new SessionKey(sessionKeyWallet, SignType.EthSign, wallet.address, permit);

  const to = WalletEOA.createRandom();
  const tx = new CallTxBuilder(true, constants.Zero, to.address, parseEther("10"), "0x").build();

  const userProvider = new providers.JsonRpcProvider("url");
  const userRelayer = new RpcRelayer("relayerUrl", MAINNET_UNIPASS_WALLET_CONTEXT, userProvider);
  const userWallet = new Wallet({
    keyset: new Keyset([]),
    address: wallet.address,
    provider: userProvider,
    relayer: userRelayer,
  });
  const nonce = await userWallet.getNonce();
  const execute = new RawMainExecuteCall(tx, nonce, sessionKey);

  const ret = await userWallet.sendTransactions(execute);
}

main();
