import { Relayer, RpcRelayer } from "@unipass-wallet.js/relayer";
import { TESTNET_UNIPASS_WALLET_CONTEXT } from "@unipasswallet/network";
import { providers } from "ethers";

describe("Test Rpc Relayer", () => {
  if (process.env.RPC_RELAYER) {
    let relayer: Relayer;
    let provider: providers.Provider;
    beforeAll(async () => {
      provider = new providers.JsonRpcProvider("https://matic-mumbai.chainstacklabs.com");
      relayer = new RpcRelayer(
        "https://d.wallet.unipass.vip/relayer-v2-polygon",
        TESTNET_UNIPASS_WALLET_CONTEXT,
        provider,
      );
    });
    describe.only("Test Rpc Relayer", () => {
      it("Get Nonce Should Seccess", async () => {
        const ret = await relayer.getNonce(TESTNET_UNIPASS_WALLET_CONTEXT.moduleMain);
        expect(ret).toBeUndefined;
      });
      it("Get MetaNonce Should Seccess", async () => {
        const ret = await relayer.getMetaNonce(TESTNET_UNIPASS_WALLET_CONTEXT.moduleMain);
        expect(ret).toBeUndefined;
      });
    });
  }
  it("For Ignoring Error `Your test suite must contain at least one test`", () => {
    expect(true).toEqual(true);
  });
});
