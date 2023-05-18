import * as dotenv from "dotenv";
import { Wallet } from "ethers";
import { SmartAccount } from "../src/smartAccount";

describe("Test Smart Account", () => {
  beforeAll(async () => {
    dotenv.config({ path: `${__dirname}/../../../.env` });
  });

  it("Test Master Key With Random Wallet", async () => {
    const jsonRpcNode = process.env.JSON_RPC_NODE!;
    const masterKeySigner = Wallet.createRandom();
    const smartAccount = new SmartAccount({
      rpcUrl: jsonRpcNode,
      masterKeySigner,
      appId: "test-app-id",
    });
    await smartAccount.init();
  });
});
