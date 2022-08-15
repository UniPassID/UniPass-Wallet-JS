import { KeyBase, RoleWeight } from "../key";
import { Transaction } from "../transaction";
import { utils } from "ethers";
import { moduleMain } from "unipass-wallet-abi";

export abstract class BaseTxBuilder implements ITxBuilder {
  protected readonly contractInterface: utils.Interface;

  constructor(public signature?: string) {
    this.contractInterface = new utils.Interface(moduleMain.abi);
  }

  abstract build(): Transaction;

  abstract digestMessage(): string;

  async generateSignature(keys: [KeyBase, boolean][]): Promise<ITxBuilder> {
    const notSessionKey = 0;
    const digestHash = this.digestMessage();
    let sig = utils.solidityPack(["uint8"], [notSessionKey]);
    const selectedRole: RoleWeight = {
      ownerWeight: 0,
      assetsOpWeight: 0,
      guardianWeight: 0,
    };
    // eslint-disable-next-line no-restricted-syntax
    for (const [key, isSig] of keys) {
      if (isSig) {
        selectedRole.ownerWeight += key.roleWeight.ownerWeight;
        selectedRole.assetsOpWeight += key.roleWeight.assetsOpWeight;
        selectedRole.guardianWeight += key.roleWeight.guardianWeight;
        sig = utils.solidityPack(
          ["bytes", "bytes"],
          // eslint-disable-next-line no-await-in-loop
          [sig, await key.generateSignature(digestHash)]
        );
      } else {
        sig = utils.solidityPack(["bytes", "bytes"], [sig, key.generateKey()]);
      }
    }

    if (!this.validateRoleWeight(selectedRole)) {
      const error: any = new Error("Invalid Role Weight");
      error.roleWeight = selectedRole;
      throw error;
    }

    this.signature = sig;
    return this;
  }

  abstract validateRoleWeight(roleWeight: RoleWeight): boolean;
}

export interface ITxBuilder {
  build(): Transaction;
  digestMessage(): string;
  generateSignature(keys: [KeyBase, boolean][]): Promise<ITxBuilder>;
  validateRoleWeight(roleWeight: RoleWeight): boolean;
}
