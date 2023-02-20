import { BigNumber, constants } from "ethers";
import { CallType } from "@unipasswallet/transactions";
import { MainExecuteCall } from "../src/mainExecuteCall";

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
    const mainExecuteCall = new MainExecuteCall(txs, nonce, signature);
    const jsonStr = mainExecuteCall.toJson();
    const obj = JSON.parse(jsonStr);
    expect(MainExecuteCall.fromJsonObj(obj)).toEqual(mainExecuteCall);
  });
});
