import { KeygenData } from "../interface";
import { worker } from "./worker-provider";

const getP2KeyGen1 = async (tssRes: KeygenData) => {
  const [context2, p2FirstMsg] = await worker.li17_p2_key_gen1(tssRes.msg);
  return [context2, p2FirstMsg];
};

const getP2KeyGen2 = async (tssRes: KeygenData, content2: string) => {
  const [signContext2, pubkey] = await worker.li17_p2_key_gen2(content2, tssRes.msg);
  return [signContext2, pubkey];
};
const getLi17P2Sign1 = async (localKey: any, msgHash: any) => {
  const [context1, message1] = await worker.li17_p2_sign1(localKey, msgHash);
  return [context1, message1];
};
const getLi17P2Sign2 = async (context1: any, msgHash: number[]) => {
  const [partialSig, message2] = await worker.li17_p2_sign2(context1, msgHash);
  return [partialSig, message2];
};

export const TssWorker = {
  getP2KeyGen1,
  getP2KeyGen2,
  getLi17P2Sign1,
  getLi17P2Sign2,
};
