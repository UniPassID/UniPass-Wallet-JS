import UnipassWalletProvider from "../src/index";

describe("Test Keyset", () => {
  it("Create Keyset Should Success", async () => {
    const wallet = new UnipassWalletProvider({ chainName: "polygon", env: "dev" });
    console.log(wallet);
  });
});
