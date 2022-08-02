import { providers } from "ethers";

export class DeployError extends Error {
  constructor(msg?: string, public receipt?: providers.TransactionReceipt) {
    super(msg);
  }
}
