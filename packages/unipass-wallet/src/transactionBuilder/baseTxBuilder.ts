import { Transaction } from "../transaction";

export abstract class BaseTxBuilder {
  abstract build(): Transaction;
}
