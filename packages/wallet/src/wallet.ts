import { Bytes, Signer, providers, BigNumber, constants, Contract, Wallet as WalletEOA } from "ethers";
import {
  concat,
  Deferrable,
  hexlify,
  keccak256,
  arrayify,
  Interface,
  getCreate2Address,
  solidityPack,
  BytesLike,
  defaultAbiCoder,
  parseEther,
} from "ethers/lib/utils";
import { Keyset, RoleWeight } from "@unipasswallet/keys";
import { Relayer, PendingExecuteCallArgs, ExecuteCall } from "@unipasswallet/relayer";
import { unipassWalletContext, UnipassWalletContext } from "@unipasswallet/network";
import { moduleMain, gasEstimator, moduleMainGasEstimator } from "@unipasswallet/abi";
import {
  isSignedTransactions,
  Transaction,
  SignedTransactions,
  digestTxHash,
  digestGuestTxHash,
  GuestTransactions,
  CallType,
  Transactionish,
  toTransactions,
} from "@unipasswallet/transactions";
import {
  isContractDeployed,
  resolveArrayProperties,
  SingletonFactoryAddress,
  SingletonFactoryInterface,
  CreationCode,
  getWalletCode,
} from "@unipasswallet/utils";
import { SessionKey } from "./sessionKey";

export interface WalletOptions {
  address?: string;
  keyset: Keyset;
  context?: UnipassWalletContext;
  provider?: providers.Provider;
  relayer?: Relayer;
}

export const OverwriterEstimatorDefaults = {
  dataZeroCost: 4,
  dataOneCost: 16,
  baseCost: 21000,
};

export class Wallet extends Signer {
  public readonly address: string;

  public readonly keyset: Keyset;

  public readonly context: UnipassWalletContext = unipassWalletContext;

  public readonly callWallet: WalletEOA;

  public readonly provider?: providers.Provider;

  public readonly relayer?: Relayer;

  constructor(options: WalletOptions) {
    super();

    const { address, keyset, context, provider, relayer } = options;

    if (!address) {
      throw new Error("address should not be undefined");
    }

    this.address = address;
    this.keyset = keyset;

    if (context) {
      this.context = context;
    }

    if (provider) {
      this.provider = provider;
    }

    if (relayer) {
      this.relayer = relayer;
    }

    this.callWallet = WalletEOA.createRandom().connect(this.provider);
  }

  static create(options: WalletOptions): Wallet {
    const createOptions = options;

    const { keyset, context = unipassWalletContext } = createOptions;

    if (!createOptions.address) {
      const address = getCreate2Address(
        SingletonFactoryAddress,
        keyset.hash(),
        keccak256(solidityPack(["bytes", "uint256"], [CreationCode, context.moduleMain])),
      );

      createOptions.address = address;
    }
    return new Wallet(createOptions);
  }

  options(): WalletOptions {
    return {
      address: this.address,
      keyset: this.keyset,
      context: this.context,
      provider: this.provider,
      relayer: this.relayer,
    };
  }

  setKeyset(keyset: Keyset): Wallet {
    const options = this.options();
    options.keyset = keyset;

    return new Wallet(options);
  }

  async getAddress(): Promise<string> {
    return this.address;
  }

  getSignRoleWeight(signerIndexes: number[]): RoleWeight {
    return this.keyset.keys
      .filter((_, index) => signerIndexes.includes(index))
      .map((v) => v.roleWeight)
      .reduce((pre, current) => pre.add(current));
  }

  async signPermit(digestHash: BytesLike, signerIndexer: number[]): Promise<string> {
    return hexlify(
      concat(
        await Promise.all(
          this.keyset.keys.map(async (key, index) => {
            if (signerIndexer.includes(index)) {
              return key.generateSignature(digestHash);
            }

            return key.generateKey();
          }),
        ),
      ),
    );
  }

  async signMessage(
    message: Bytes | string,
    sessionKeyOrSignerIndexes: number[] | SessionKey = [],
    isDigest: boolean = true,
  ): Promise<string> {
    if (typeof message === "string") {
      throw new Error("Please use Bytes");
    }

    const digestHash = isDigest ? hexlify(message) : keccak256(message);

    let sig;

    if (!Array.isArray(sessionKeyOrSignerIndexes)) {
      const isSessionKey = 1;
      sig = solidityPack(
        ["uint8", "bytes"],
        [isSessionKey, await sessionKeyOrSignerIndexes.generateSignature(digestHash)],
      );
    } else if (sessionKeyOrSignerIndexes.length === 0) {
      sig = "0x";
    } else {
      const isSessionKey = 0;
      sig = solidityPack(
        ["uint8", "bytes"],
        [isSessionKey, await this.signPermit(digestHash, sessionKeyOrSignerIndexes)],
      );
    }

    return sig;
  }

  connect(provider: providers.Provider): Wallet {
    const options = this.options();
    options.provider = provider;

    return new Wallet(options);
  }

  signTransaction(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _: Deferrable<providers.TransactionRequest>,
  ): Promise<string> {
    throw new Error("Not Support `signTransaction`, Please use `signTransactions` instead");
  }

  async getExecuteSignedTransaction(
    transactions: Transaction[],
    sessionKeyOrSignIndexes: SessionKey | number[],
    index: number = 0,
  ): Promise<SignedTransactions> {
    const { chainId } = await this.provider!.getNetwork();
    const a = await this.relayer.getNonce(this.address);
    console.log(a);

    const nonce = BigNumber.from(a).toNumber() + index;
    console.log("index:");
    console.log(index);
    console.log("nonce:");
    console.log(nonce);

    const txHash = await digestTxHash(chainId, this.address, nonce, transactions);

    const signature = await this.signMessage(arrayify(txHash), sessionKeyOrSignIndexes);

    return {
      _isSignedTransactions: true,
      txHash,
      transactions,
      nonce,
      signature,
    };
  }

  async getExecuteTransaction(
    transactions: SignedTransactions | Transaction[],
    sessionKeyOrSignerIndexes: number[] | SessionKey,
  ): Promise<Transaction> {
    let signedTransactions = transactions;

    if (Array.isArray(signedTransactions)) {
      signedTransactions = await this.getExecuteSignedTransaction(signedTransactions, sessionKeyOrSignerIndexes);
    }

    return {
      _isUnipassWalletTransaction: true,
      target: this.address,
      callType: CallType.Call,
      revertOnError: false,
      gasLimit: constants.Zero,
      value: constants.Zero,
      data: new Interface(moduleMain.abi).encodeFunctionData("execute", [
        signedTransactions.transactions,
        signedTransactions.nonce,
        signedTransactions.signature,
      ]),
    };
  }

  async signTransactions(
    transactionish: Deferrable<Transactionish>,
    sessionKeyOrSignerIndexes: SessionKey | number[] | "BUNDLED",
    index: number = 0,
  ): Promise<SignedTransactions | GuestTransactions> {
    let transactions = toTransactions(await resolveArrayProperties<Transactionish>(transactionish));
    if (transactions.length === 0) {
      throw new Error("Transactinos is Empty");
    }

    transactions = await this.estimateGasLimits(...transactions);

    if (sessionKeyOrSignerIndexes === "BUNDLED") {
      return {
        _isGuestTransaction: true,
        transactions,
        txHash: digestGuestTxHash(await this.getChainId(), this.context.moduleGuest, transactions),
      };
    }

    return this.getExecuteSignedTransaction(transactions, sessionKeyOrSignerIndexes, index);
  }

  txBaseCost(data: BytesLike): BigNumber {
    const bytes = arrayify(data);
    return bytes
      .reduce(
        (p, c) =>
          c === 0 ? p.add(OverwriterEstimatorDefaults.dataZeroCost) : p.add(OverwriterEstimatorDefaults.dataOneCost),
        constants.Zero,
      )
      .add(OverwriterEstimatorDefaults.baseCost);
  }

  async isValidSignature(hash: BytesLike, sig: BytesLike): Promise<boolean> {
    try {
      const contract = this.getContract();
      const ret = await contract.isValidSignature(hash, sig);
      return ret === "0x1626ba7e";
    } catch (e) {
      return false;
    }
  }

  async unipassEstimateGas(signedTransactions: SignedTransactions | GuestTransactions): Promise<BigNumber> {
    // let data: string;
    // let transactions: Transaction[];
    // let estimateData: string;
    // if (isSignedTransactions(signedTransactions)) {
    //   transactions = signedTransactions.transactions;
    //   data = new Interface(moduleMain.abi).encodeFunctionData("execute", [
    //     signedTransactions.transactions,
    //     signedTransactions.nonce,
    //     signedTransactions.signature,
    //   ]);
    //   estimateData = new Interface(moduleMain.abi).encodeFunctionData("execute", [
    //     [],
    //     signedTransactions.nonce,
    //     signedTransactions.signature,
    //   ]);
    // } else {
    //   transactions = signedTransactions.transactions;
    //   data = new Interface(moduleMain.abi).encodeFunctionData("execute", [signedTransactions.transactions, 0, "0x"]);
    //   estimateData = new Interface(moduleMain.abi).encodeFunctionData("execute", [[], 0, "0x"]);
    // }

    // const params = [
    //   {
    //     from: this.address,
    //     to: this.context.gasEstimator,
    //     gasLimit: parseEther("0.01").toHexString(),
    //     data: new Interface(gasEstimator.abi).encodeFunctionData("estimate", [
    //       this.address,
    //       // FIXME
    //       estimateData,
    //     ]),
    //   },
    //   "latest",
    //   {
    //     [this.context.moduleMain]: {
    //       code: moduleMainGasEstimator.bytecode,
    //     },
    //     [this.context.moduleMainUpgradable]: {
    //       code: moduleMainGasEstimator.bytecode,
    //     },
    //   },
    // ];
    // const retBytes = await (this.provider as providers.JsonRpcProvider).send("eth_call", params);
    // const [succ, reason, baseGas] = defaultAbiCoder.decode(["bool", "bytes", "uint256"], retBytes);
    // if (!succ) {
    //   throw new Error(`estimate gas Limit failed: ${reason}`);
    // }

    // const gas = transactions
    //   .map((v) => {
    //     if (v.gasLimit === constants.Zero) {
    //       throw new Error("Got Transaction Gas Limit Zero");
    //     }
    //     return v.gasLimit;
    //   })
    //   .reduce((pre, cur) => pre.add(cur), constants.Zero);
    // return gas.add(this.txBaseCost(data)).add(BigNumber.from(6000)).add(baseGas);
    return BigNumber.from(10_000_000);
  }

  async sendTransaction(
    transaction: Deferrable<Transactionish>,
    sessionKeyOrSignerIndexes: SessionKey | number[] | "BUNDLED" = [],
    index?: number,
    feeToken?: string,
  ): Promise<providers.TransactionResponse> {
    const signedTransactions = await this.signTransactions(transaction, sessionKeyOrSignerIndexes, index);

    let args: PendingExecuteCallArgs;

    const { chainId } = await this.provider!.getNetwork();
    const moduleMainInterface = new Interface(moduleMain.abi);

    let nonce: BigNumber;
    let data: string;
    const estimateGas = await this.unipassEstimateGas(signedTransactions);

    if (isSignedTransactions(signedTransactions)) {
      nonce = BigNumber.from(signedTransactions.nonce);
      const signature = hexlify(signedTransactions.signature);
      const call: ExecuteCall = {
        txs: signedTransactions.transactions.map((v) => ({
          ...v,
          target: hexlify(v.target),
          value: v.value.toHexString(),
          gasLimit: v.gasLimit.toHexString(),
          data: hexlify(v.data),
        })),
        nonce: nonce.toHexString(),
        signature,
      };
      data = moduleMainInterface.encodeFunctionData("execute", [signedTransactions.transactions, nonce, signature]);
      args = {
        chainId: hexlify(chainId),
        txHash: hexlify(signedTransactions.txHash),
        walletAddress: this.address,
        estimateGas: estimateGas.toHexString(),
        call: JSON.stringify(call),
        feeToken,
      };
    } else {
      nonce = constants.Zero;
      const signature = "0x";
      const call: ExecuteCall = {
        txs: signedTransactions.transactions.map((v) => ({
          ...v,
          value: v.value.toHexString(),
          target: hexlify(v.target),
          gasLimit: v.gasLimit.toHexString(),
          data: hexlify(v.data),
        })),
        nonce: nonce.toHexString(),
        signature,
      };
      data = moduleMainInterface.encodeFunctionData("execute", [signedTransactions.transactions, nonce, signature]);

      args = {
        chainId: hexlify(chainId),
        txHash: hexlify(signedTransactions.txHash),
        walletAddress: this.context.moduleGuest,
        estimateGas: estimateGas.toHexString(),
        call: JSON.stringify(call),
        feeToken,
      };
    }

    const hash = await this.relayer.relay(args);

    return {
      hash,
      confirmations: 1,
      from: this.address,
      chainId,
      nonce: nonce.toNumber(),
      gasLimit: estimateGas,
      data,
      value: constants.Zero,
      wait: async () => {
        let ret = await this.relayer.wait(hash);
        const timeout = 30;
        let i = 0;
        while (ret === undefined || ret === null) {
          if (i < timeout) {
            // eslint-disable-next-line no-await-in-loop, no-promise-executor-return
            await new Promise((resolve) => setTimeout(resolve, 1000));
            // eslint-disable-next-line no-await-in-loop
            ret = await this.relayer.wait(hash);
          } else {
            return Promise.reject(new Error("Timeout Error"));
          }
          i++;
        }

        if (ret.txHash === constants.HashZero) {
          return Promise.reject(new Error(`transactions revert: ${ret.revertReason}`));
        }
        const recipt = await this.provider.waitForTransaction(ret.txHash);

        return recipt;
      },
    };
  }

  async isSyncKeysetHash(): Promise<boolean> {
    if (!(await isContractDeployed(this.address, this.provider))) {
      return false;
    }

    const contract = this.getContract();
    const keysetHash = await contract.getKeysetHash();

    return keysetHash === constants.HashZero || keysetHash === this.keyset.hash();
  }

  getContract(): Contract {
    const contract = new Contract(this.address, moduleMain.abi, this.callWallet);

    return contract;
  }

  async estimateGasLimits(...transactions: Transaction[]): Promise<Transaction[]> {
    //   const txs = transactions;
    //   if (this.provider instanceof providers.JsonRpcProvider) {
    //     const gasLimits = await Promise.all(
    //       [...txs.keys(), txs.length].map(async (index) => {
    //         const data = new Interface(gasEstimator.abi).encodeFunctionData("estimate", [
    //           this.address,
    //           // FIXME
    //           new Interface(moduleMain.abi).encodeFunctionData("execute", [transactions.slice(0, index), 0, "0x"]),
    //         ]);

    //         const params = [
    //           {
    //             from: this.address,
    //             to: this.context.gasEstimator,
    //             gasLimit: parseEther("0.01").toHexString(),
    //             data,
    //           },
    //           "latest",
    //           {
    //             [this.context.moduleMain]: {
    //               code: moduleMainGasEstimator.bytecode,
    //             },
    //             [this.context.moduleMainUpgradable]: {
    //               code: moduleMainGasEstimator.bytecode,
    //             },
    //           },
    //         ];
    //         const retBytes = await (this.provider as providers.JsonRpcProvider).send("eth_call", params);
    //         const [succ, reason, gas] = defaultAbiCoder.decode(["bool", "bytes", "uint256"], retBytes);
    //         if (!succ) {
    //           throw new Error(`estimate gas Limit failed: ${reason}`);
    //         }
    //         return gas;
    //       }),
    //     );

    //     gasLimits.reduce((pre, current, i) => {
    //       if (i > 0 && txs[i - 1].gasLimit.eq(constants.Zero) && txs[i - 1].callType === CallType.Call) {
    //         txs[i - 1].gasLimit = current.sub(pre);
    //       }
    //       return current;
    //     }, 0);

    //     return txs;
    //   }
    //   return Promise.reject(new Error("Expect JsonRpcProvider"));
    return transactions;
  }
}

export function getWalletDeployTransaction(
  context: UnipassWalletContext,
  keysetHash: BytesLike,
  creatationGasLimit: BigNumber = constants.Zero,
): Transaction {
  return {
    _isUnipassWalletTransaction: true,
    target: SingletonFactoryAddress,
    data: SingletonFactoryInterface.encodeFunctionData("deploy", [getWalletCode(context.moduleMain), keysetHash]),
    gasLimit: creatationGasLimit,
    value: constants.Zero,
    revertOnError: true,
    callType: CallType.Call,
  };
}
