import { KeyBase } from "./key";
import { utils } from "ethers";

export function getKeysetHash(keys: KeyBase[]): string {
  let keysetHash = "0x";
  keys.forEach((key) => {
    keysetHash = utils.keccak256(
      utils.solidityPack(["bytes", "bytes"], [keysetHash, key.serialize()])
    );
  });
  return keysetHash;
}
