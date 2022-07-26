import { randomInt } from "crypto";
import { randomBytes } from "ethers/lib/utils";
import { DkimParamsBase } from "../src/dkimParams";

describe("Test DkimParamsBase", () => {
  it("ToString And FromString Should Success", () => {
    const dkimParamsBase = new DkimParamsBase(
      randomBytes(32),
      randomBytes(32),
      randomInt(100),
      randomInt(100),
      randomInt(100),
      randomInt(100),
      randomInt(100),
      [randomBytes(32)],
      randomBytes(32),
      [],
      randomInt(100),
      randomInt(100),
      randomInt(100),
      randomInt(100),
      randomInt(100)
    );
    const parsedDkimParamsBase = DkimParamsBase.fromString(
      dkimParamsBase.toString()
    );
    expect(Buffer.from(dkimParamsBase.emailHeader).toString("hex")).toEqual(
      Buffer.from(parsedDkimParamsBase.emailHeader).toString("hex")
    );
    expect(Buffer.from(dkimParamsBase.dkimSig).toString("hex")).toEqual(
      Buffer.from(parsedDkimParamsBase.dkimSig).toString("hex")
    );
    expect(dkimParamsBase.fromIndex).toEqual(parsedDkimParamsBase.fromIndex);
    expect(dkimParamsBase.fromLeftIndex).toEqual(
      parsedDkimParamsBase.fromLeftIndex
    );
    expect(dkimParamsBase.fromRightIndex).toEqual(
      parsedDkimParamsBase.fromRightIndex
    );
    expect(dkimParamsBase.subjectIndex).toEqual(
      parsedDkimParamsBase.subjectIndex
    );
    expect(dkimParamsBase.subjectRightIndex).toEqual(
      parsedDkimParamsBase.subjectRightIndex
    );
    dkimParamsBase.subject.forEach((subject, i) => {
      expect(Buffer.from(subject).toString("hex")).toEqual(
        Buffer.from(parsedDkimParamsBase.subject[i]).toString("hex")
      );
    });
    expect(Buffer.from(dkimParamsBase.subjectPadding).toString("hex")).toEqual(
      Buffer.from(parsedDkimParamsBase.subjectPadding).toString("hex")
    );
    expect(dkimParamsBase.isSubBase64).toEqual(
      parsedDkimParamsBase.isSubBase64
    );
    expect(dkimParamsBase.dkimHeaderIndex).toEqual(
      parsedDkimParamsBase.dkimHeaderIndex
    );
    expect(dkimParamsBase.sdidIndex).toEqual(parsedDkimParamsBase.sdidIndex);
    expect(dkimParamsBase.sdidRightIndex).toEqual(
      parsedDkimParamsBase.sdidRightIndex
    );
    expect(dkimParamsBase.selectorIndex).toEqual(
      parsedDkimParamsBase.selectorIndex
    );
    expect(dkimParamsBase.selectorRightIndex).toEqual(
      parsedDkimParamsBase.selectorRightIndex
    );
  });
});
