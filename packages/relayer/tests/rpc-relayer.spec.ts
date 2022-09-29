import { Relayer, RpcRelayer } from "@unipass-wallet.js/relayer";
import { unipassWalletContext } from "@unipasswallet/network";
import { providers } from "ethers";

describe("Test Rpc Relayer", () => {
  if (process.env.RPC_RELAYER) {
    let relayer: Relayer;
    let provider: providers.Provider;
    beforeAll(async () => {
      provider = new providers.JsonRpcProvider("https://matic-mumbai.chainstacklabs.com");
      relayer = new RpcRelayer("https://d.wallet.unipass.vip/relayer-polygon", unipassWalletContext, provider);
    });
    describe.only("Test Rpc Relayer", () => {
      it("Get Options Should Success", async () => {
        const ret = await relayer.getFeeOptions("0x00");
        expect(ret.options.length).not.toEqual(0);
      });
      it("Get Nonce Should Seccess", async () => {
        const ret = await relayer.getNonce(unipassWalletContext.moduleMain);
        console.log(ret);
        expect(ret).toBeUndefined;
      });
      it("Get MetaNonce Should Seccess", async () => {
        const ret = await relayer.getMetaNonce(unipassWalletContext.moduleMain);
        expect(ret).toBeUndefined;
      });
    });
  }
});
