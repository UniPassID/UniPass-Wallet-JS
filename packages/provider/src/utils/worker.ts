import init, {
  keccak256,
  li17_p2_key_gen1,
  li17_p2_key_gen2,
  li17_p2_sign1,
  li17_p2_sign2,
  li17_p2_refresh1,
} from "lindell-ecdsa-wasm";
import * as Comlink from "comlink";

// Temporary hack for getRandomValues() error
const { getRandomValues } = crypto;
crypto.getRandomValues = function (array: any) {
  const buffer = new Uint8Array(array);
  const value = getRandomValues.call(crypto, buffer);
  array.set(value);
  return array;
};

console.log("Worker is initializing...");
// eslint-disable-next-line no-void
void (async function () {
  await init();
  self.postMessage({ ready: true });
})();

Comlink.expose({
  keccak256,
  li17_p2_key_gen1,
  li17_p2_key_gen2,
  li17_p2_sign1,
  li17_p2_sign2,
  li17_p2_refresh1,
});
