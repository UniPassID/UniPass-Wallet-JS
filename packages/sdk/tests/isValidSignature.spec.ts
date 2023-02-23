import { randomBytes } from "crypto";
import {
  KeyERC1271,
  KeyOpenIDSignType,
  KeyOpenIDWithEmail,
  KeySecp256k1Wallet,
  Keyset,
  RoleWeight,
  SignType,
} from "@unipasswallet/keys";
import { Wallet as WalletEOA } from "ethers";
import { Wallet, isValidSignature } from "@unipasswallet/wallet";
import { hexlify } from "ethers/lib/utils";

describe("Off Chain Validate Signature", () => {
  it("Test OffChain IsValidSignature", async () => {
    const message = randomBytes(32);
    const key = new KeySecp256k1Wallet(WalletEOA.createRandom(), new RoleWeight(100, 100, 100), SignType.EthSign);
    const keyset = new Keyset([
      key,
      new KeyOpenIDWithEmail({
        roleWeight: new RoleWeight(0, 0, 0),
        emailOptionsOrEmailHash: "0x1234567812345678123456781234567812345678123456781234567812345678",
        openIDOptionsOrOpenIDHash: {
          issuer: "issuer",
          sub: "sub",
          openIDHash: "0x1234567812345678123456781234567812345678123456781234567812345678",
        },
        signType: KeyOpenIDSignType.OpenIDSign,
      }),
      new KeyERC1271("0x1234123412341234123412341234123412341234", new RoleWeight(0, 0, 0)),
    ]);
    const wallet = new Wallet({ keyset, address: hexlify(randomBytes(20)) });
    const sig = await wallet.signMessage(message, [0]);
    const ret = await isValidSignature(hexlify(message), sig, wallet.address, wallet.keyset.hash());
    expect(ret).toBe(true);
  });
});
