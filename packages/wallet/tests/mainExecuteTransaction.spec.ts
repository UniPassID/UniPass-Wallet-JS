import { BigNumber, constants } from "ethers";
import { CallType } from "@unipasswallet/transactions";
import { MainExecuteCall } from "../src/mainExecuteCall";
import { MainExecuteTransaction } from "../src/mainExecuteTransaction";

describe("Test Main Execute Call", () => {
  it("Serialize and Deserialize Should Success", async () => {
    const txs = [
      {
        _isUnipassWalletTransaction: true,
        callType: CallType.Call,
        revertOnError: true,
        gasLimit: BigNumber.from(1),
        target: constants.AddressZero,
        value: BigNumber.from(2),
        data: constants.HashZero,
      },
    ];
    const nonce = BigNumber.from(3);
    const signature = constants.AddressZero;
    const executeCall = new MainExecuteCall(txs, nonce, signature);
    const gasLimit = BigNumber.from(4);
    const revertOnError = false;
    const target = constants.AddressZero;
    const value = BigNumber.from(5);
    const callType = CallType.DelegateCall;
    const mainExecuteTransaction = new MainExecuteTransaction({
      executeCall,
      gasLimit,
      revertOnError,
      target,
      value,
      callType,
    });
    const jsonStr = mainExecuteTransaction.toJson();
    const obj = JSON.parse(jsonStr);
    expect(MainExecuteTransaction.fromJsonObj(obj)).toEqual(mainExecuteTransaction);
  });
});
