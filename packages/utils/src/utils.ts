import {
  BytesLike,
  keccak256,
  solidityPack,
  toUtf8Bytes,
} from "ethers/lib/utils";

export function subDigest(
  chainId: number,
  address: string,
  hash: BytesLike
): string {
  return keccak256(
    solidityPack(
      ["bytes", "uint256", "address", "bytes32"],
      [toUtf8Bytes("\x19\x01"), chainId, address, hash]
    )
  );
}
