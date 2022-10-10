import init, {
  keccak256,
  li17_p2_key_gen1,
  li17_p2_key_gen2,
  li17_p2_sign1,
  li17_p2_sign2,
  li17_p2_refresh1,
} from "lindell-ecdsa-wasm";
import * as Comlink from "comlink";

export const initLindellEcdsaWasm = async () => {
  try {
    await init();
    window.postMessage({ ready: true });
    const { getRandomValues } = crypto;
    crypto.getRandomValues = (array: any) => {
      const buffer = new Uint8Array(array);
      const value = getRandomValues.call(crypto, buffer);
      array.set(value);
      return array;
    };
    console.log("Worker is initialized");
  } catch (error) {
    console.error("Worker is initializing error", error);
  }
};

Comlink.expose({
  keccak256,
  li17_p2_key_gen1,
  li17_p2_key_gen2,
  li17_p2_sign1,
  li17_p2_sign2,
  li17_p2_refresh1,
});
