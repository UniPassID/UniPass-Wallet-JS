import { BytesLike, utils, Wallet as WalletEOA } from "ethers";
import { KeySecp256k1, sign, SignType } from "@unipasswallet/keys";
import { defineReadOnly } from "ethers/lib/utils";
import { digestPermitMessage, generatePermit, IPermit } from "./permit";
import { Wallet } from "./wallet";

export interface SessionKeyStore {
  localKey: {
    keystore: string;
    address: string;
  };
  aesKey: CryptoKey;
  authorization: string;
  expires: number;
  weight: number;
}

export class SessionKey {
  public readonly userAddr: string;

  public readonly _isSessionKey: boolean;

  constructor(
    public readonly wallet: WalletEOA,
    public readonly signType: SignType,
    _userAddr: BytesLike,
    public permit?: IPermit,
  ) {
    this.userAddr = utils.hexlify(_userAddr);
    defineReadOnly(this, "_isSessionKey", true);
  }

  public digestPermitMessage(timestamp: number, weight: number): string {
    return digestPermitMessage(this.userAddr, this.wallet.address, timestamp, weight);
  }

  public async generatePermit(
    timestamp: number,
    weight: number,
    wallet: Wallet,
    signerIndexes: number[],
  ): Promise<SessionKey> {
    const permit = await generatePermit(wallet, this.wallet.address, timestamp, weight, signerIndexes);

    this.permit = permit;

    return this;
  }

  public async generateSignature(digestHash: string): Promise<string> {
    return utils.solidityPack(
      ["uint32", "uint32", "bytes", "bytes"],
      [
        this.permit!.timestamp,
        this.permit!.weight,
        await sign(digestHash, this.wallet, this.signType),
        this.permit!.permit,
      ],
    );
  }

  static async fromSessionKeyStore(
    store: SessionKeyStore,
    _wallet: Wallet,
    aesDecryptor: (aesKey: CryptoKey, sig: BytesLike) => Promise<string>,
  ): Promise<SessionKey> {
    const { keyset } = _wallet;
    const privateKey = await aesDecryptor(store.aesKey, store.localKey.keystore);

    const materKey = keyset.keys[0];
    if (KeySecp256k1.isKeySecp256k1(materKey)) {
      keyset.keys[0] = new KeySecp256k1(
        materKey.address,
        materKey.roleWeight,
        materKey.getSignType(),
        async () => store.authorization,
      );
    } else {
      throw new Error("Master Key Should By KeySecp256k1");
    }

    const wallet = _wallet.setKeyset(keyset);

    let sessionKey = new SessionKey(new WalletEOA(privateKey), SignType.EthSign, store.localKey.address);

    sessionKey = await sessionKey.generatePermit(store.expires, store.weight, wallet, [0]);

    return sessionKey;
  }

  public static isSessionKey(v: any): v is SessionKey {
    return v._isSessionKey;
  }
}
