import { BigNumber, constants } from "ethers";
import { BundledExecuteCall } from "../src/bundledExecuteCall";
import { CallType } from "@unipasswallet/transactions";

describe("Test Bundled Execute Call", () => {
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
    const bundledExecuteCall = new BundledExecuteCall(txs);
    const jsonStr = bundledExecuteCall.toJson();
    const obj = JSON.parse(jsonStr);
    expect(BundledExecuteCall.fromJsonObj(obj)).toEqual(bundledExecuteCall);
  });
});
