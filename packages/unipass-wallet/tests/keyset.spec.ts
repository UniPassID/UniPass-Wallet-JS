import {
  KeyEmailDkim,
  KeySecp256k1,
  KeyType,
  serializeRoleWeight,
  sign,
  SignFlag,
  SignType,
} from "../src/key";
import { Keyset } from "../src/keyset";
import { BytesLike, utils, Wallet } from "ethers";

describe("Test Keyset", () => {
  it("Create Keyset Should Success", async () => {
    const registerEmail = "test1@gmail.com";
    const masterKeyInner = Wallet.createRandom();
    const masterKeyRoleWeight = {
      ownerWeight: 40,
      guardianWeight: 60,
      assetsOpWeight: 0,
    };
    const masterKey = new KeySecp256k1(
      masterKeyInner.address,
      masterKeyRoleWeight,
      SignType.EthSign,
      async (digestHash: BytesLike): Promise<string> =>
        utils.solidityPack(
          ["uint8", "uint8", "bytes", "bytes"],
          [
            KeyType.Secp256k1,
            SignFlag.Sign,
            await sign(digestHash, masterKeyInner, SignType.EthSign),
            serializeRoleWeight(masterKeyRoleWeight),
          ]
        )
    );
    const keyset = Keyset.new(registerEmail, masterKey, []);
    expect(keyset.keys[0]).toEqual(masterKey);
    expect(keyset.keys[1]).toEqual(
      new KeyEmailDkim(registerEmail, {
        ownerWeight: 40,
        assetsOpWeight: 100,
        guardianWeight: 0,
      })
    );
  });
});
