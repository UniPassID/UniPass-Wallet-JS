import { SignType } from "../sigGenerator";

export class SignError extends Error {
  constructor(msg?: string, public signType?: SignType) {
    super(msg);
  }
}
