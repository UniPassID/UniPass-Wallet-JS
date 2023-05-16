import init, { keccak256, li17_p2_key_gen1, li17_p2_key_gen2, li17_p2_sign1, li17_p2_sign2 } from "tss-wasm";
import * as Comlink from "comlink";

// Temporary hack for getRandomValues() error
const { getRandomValues } = crypto;
// eslint-disable-next-line func-names
crypto.getRandomValues = function (array: any) {
  const buffer = new Uint8Array(array);
  const value = getRandomValues.call(crypto, buffer);
  array.set(value);
  return array;
};

// eslint-disable-next-line no-void, func-names
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
});

// @ts-ignore
export const webWorker = new Worker(new URL("./worker", import.meta.url));

export const worker = Comlink.wrap<any>(webWorker);
