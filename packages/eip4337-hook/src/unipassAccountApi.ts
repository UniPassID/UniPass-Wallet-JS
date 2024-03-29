import { BigNumber, BigNumberish, Contract, providers } from "ethers";
import { arrayify, resolveProperties } from "ethers/lib/utils";
import { BaseAccountAPI, BaseApiParams } from "@account-abstraction/sdk/dist/src/BaseAccountAPI";
import { Wallet } from "@unipasswallet/wallet";
import { ModuleHookEIP4337WalletInterface } from "@unipasswallet/utils";
import { UserOperationStruct } from "@account-abstraction/contracts";
import { DUMMY_PAYMASTER_AND_DATA, VerifyingPaymasterAPI } from "./verifyingPaymasterAPI";
import { calcPreVerificationGas } from "@account-abstraction/sdk";
import { isAddEIP4337Hook } from "./utils";
import { TransactionDetailsForUserOp } from "@account-abstraction/sdk/dist/src/TransactionDetailsForUserOp";

const EIP1559_FEE_ESTIMATION_PAST_BLOCKS = 10;
const EIP1559_FEE_ESTIMATION_REWARD_PERCENTILE = 5.0;

/**
 * constructor params, added no top of base params:
 * @param owner the signer object for the account owner
 * @param factoryAddress address of contract "factory" to deploy new contracts (not needed if account already deployed)
 * @param index nonce value used when creating multiple accounts for the same owner
 */
export interface UnipassAccountApiParams extends BaseApiParams {
  factoryAddress?: string;
  signerIndexes?: number[];
  wallet: Wallet;
}

/**
 * An implementation of the BaseAccountAPI using the SimpleAccount contract.
 * - contract deployer gets "entrypoint", "owner" addresses and "index" nonce
 * - owner signs requests using normal "Ethereum Signed Message" (ether's signer.signMessage())
 * - nonce method is "nonce()"
 * - execute method is "execFromEntryPoint()"
 */
export class UnipassAccountAPI extends BaseAccountAPI {
  factoryAddress?: string;

  signerIndexes: number[];

  accountContract?: Contract;

  wallet: Wallet;

  constructor(params: UnipassAccountApiParams) {
    super(params);
    this.factoryAddress = params.factoryAddress;
    this.signerIndexes = params.signerIndexes ?? [0];
    this.wallet = params.wallet;
  }

  async _getAccountContract(): Promise<Contract> {
    if (!this.accountContract) {
      this.accountContract = new Contract(
        await this.getAccountAddress(),
        ModuleHookEIP4337WalletInterface,
        this.provider,
      );
    }
    return this.accountContract;
  }

  /**
   * return the value to put into the "initCode" field, if the account is not yet deployed.
   * this value holds the "factory" address, followed by this account's information
   */
  async getAccountInitCode(): Promise<string> {
    return "0x";
  }

  async getNonce(): Promise<BigNumber> {
    if (await this.checkAccountPhantom()) {
      return BigNumber.from(1);
    }
    const accountContract = await this._getAccountContract();
    return (await accountContract.getEIP4337WalletNonce()).add(1);
  }

  /**
   * encode a method call from entryPoint to our contract
   * @param target
   * @param value
   * @param data
   */
  async encodeExecute(target: string, value: BigNumberish, data: string): Promise<string> {
    return data;
  }

  async signUserOpHash(userOpHash: string): Promise<string> {
    return this.wallet.signMessage(arrayify(userOpHash), this.signerIndexes);
  }

  async createUnsignedUserOp(info: TransactionDetailsForUserOp): Promise<UserOperationStruct> {
    const [userOp, maxPriorityFeePerGas] = await Promise.all([
      super.createUnsignedUserOp(info),
      (this.provider as providers.JsonRpcProvider).send("eth_maxPriorityFeePerGas", []),
    ]);
    userOp.maxPriorityFeePerGas = maxPriorityFeePerGas;
    return userOp;
  }

  async getUserOpReceipt(userOpHash: string, timeout = 30000, interval = 5000): Promise<string | null> {
    const endtime = Date.now() + timeout;
    const block = await this.provider.getBlock("latest");
    while (Date.now() < endtime) {
      // eslint-disable-next-line no-await-in-loop
      const events = await (<any>this).entryPointView.queryFilter(
        (<any>this).entryPointView.filters.UserOperationEvent(userOpHash),
        Math.max(0, block.number - 100),
      );
      if (events.length > 0) {
        return events[0].transactionHash;
      }
      // eslint-disable-next-line no-await-in-loop, no-promise-executor-return
      await new Promise((resolve) => setTimeout(resolve, interval));
    }
    return null;
  }

  async getPreVerificationGas(userOp: Partial<UserOperationStruct>): Promise<number> {
    const p = await resolveProperties({
      ...userOp,
      paymasterAndData: DUMMY_PAYMASTER_AND_DATA,
    });
    return calcPreVerificationGas(p, this.overheads);
  }

  async getVerificationGasLimit() {
    return 200000;
  }

  async needAddHook(chain: number, impl: string): Promise<boolean> {
    if (VerifyingPaymasterAPI.isVerifyingPaymasterAPI(this.paymasterAPI)) {
      if (!(await this.paymasterAPI.isWhiteList(chain, this.wallet.address))) {
        return false;
      }
    }

    return !isAddEIP4337Hook(this.wallet.address, this.wallet.provider!, impl);
  }
}
