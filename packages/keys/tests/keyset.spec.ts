import {
  KeySecp256k1,
  KeySecp256k1Wallet,
  sign,
  SignType,
  KeyERC1271,
  RoleWeight,
  Keyset,
  KeyOpenIDWithEmail,
  KeyOpenIDSignType,
  KeyEmailDkimSignType,
} from "@unipass-wallet.js/keys";
import { BytesLike, Wallet, utils } from "ethers";
import { hexlify } from "ethers/lib/utils";

describe("Test Keyset", () => {
  const issuer = "unipas-wallet:test:issuer";
  const sub = "unipas-wallet:test:sub";
  it("Create Keyset Should Success", async () => {
    const registerEmail = "test1@gmail.com";
    const registerEmailPepper = utils.randomBytes(32);
    const masterKeyInner = Wallet.createRandom();
    const masterKeyRoleWeight = new RoleWeight(40, 0, 60);
    const masterKey = new KeySecp256k1(
      masterKeyInner.address,
      masterKeyRoleWeight,
      SignType.EthSign,
      async (digestHash: BytesLike): Promise<string> => sign(digestHash, masterKeyInner, SignType.EthSign),
    );
    const guardian1 = new KeyERC1271(Wallet.createRandom().address, masterKeyRoleWeight);
    const guardian2 = new KeySecp256k1Wallet(Wallet.createRandom(), masterKeyRoleWeight, SignType.EIP712Sign);
    const keyset = Keyset.create(registerEmail, registerEmailPepper, { issuer, sub }, masterKey, [
      guardian1,
      guardian2,
    ]);
    const keysetRecover = Keyset.fromJson(keyset.toJson());
    expect(KeySecp256k1.isKeySecp256k1(keyset.keys[0])).toBe(true);
    expect(KeyOpenIDWithEmail.isKeyOpenIDWithEmail(keyset.keys[1])).toBe(true);
    expect(KeyERC1271.isKeyERC1271(keyset.keys[2])).toBe(true);
    expect(KeySecp256k1Wallet.isKeySecp256k1Wallet(keyset.keys[3])).toBe(true);
    expect(keyset.keys[0]).toEqual(masterKey);
    expect(keyset.keys[1]).toEqual(
      new KeyOpenIDWithEmail({
        emailOptionsOrEmailHash: {
          type: "Raw",
          signType: KeyEmailDkimSignType.DkimZK,
          emailFrom: registerEmail,
          pepper: hexlify(registerEmailPepper),
        },
        openIDOptionsOrOpenIDHash: {
          issuer,
          sub,
        },
        roleWeight: new RoleWeight(60, 0, 60),
        signType: KeyOpenIDSignType.OpenIDSign,
      }),
    );
    masterKey.signFunc = undefined;
    expect(KeySecp256k1.isKeySecp256k1(keysetRecover.keys[0])).toBe(true);
    expect(KeyOpenIDWithEmail.isKeyOpenIDWithEmail(keysetRecover.keys[1])).toBe(true);
    expect(KeyERC1271.isKeyERC1271(keysetRecover.keys[2])).toBe(true);
    expect(KeySecp256k1Wallet.isKeySecp256k1Wallet(keysetRecover.keys[3])).toBe(true);
    expect(keysetRecover.keys[0]).toEqual(masterKey);
    expect(keysetRecover.keys[1]).toEqual(keyset.keys[1]);
    expect(keysetRecover.keys[2]).toEqual(keyset.keys[2]);
    expect(keysetRecover.keys[3].roleWeight).toEqual(keyset.keys[3].roleWeight);
    expect((keysetRecover.keys[3] as KeySecp256k1Wallet).getSignType()).toEqual(
      (keyset.keys[3] as KeySecp256k1Wallet).getSignType(),
    );
    expect((keysetRecover.keys[3] as KeySecp256k1Wallet).wallet.address).toEqual(
      (keyset.keys[3] as KeySecp256k1Wallet).wallet.address,
    );
  });
});
