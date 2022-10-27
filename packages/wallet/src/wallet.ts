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
} from "ethers/lib/utils";
import { Keyset, RoleWeight } from "@unipasswallet/keys";
import { Relayer, PendingExecuteCallArgs, ExecuteCall, toUnipassTransaction } from "@unipasswallet/relayer";
import { unipassWalletContext, UnipassWalletContext } from "@unipasswallet/network";
import { moduleMain, gasEstimator } from "@unipasswallet/abi";
import {
  Transaction,
  digestTxHash,
  digestGuestTxHash,
  CallType,
  Transactionish,
  isUnipassWalletTransaction,
  toTransaction,
} from "@unipasswallet/transactions";
import {
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

export type ExecuteTransaction = {
  type: "Execute";
  transactions: Transactionish[] | Transactionish;
  sessionKeyOrSignerIndex: SessionKey | number[];
  gasLimit: BigNumber;
};

export function isExecuteTransaction(tx: any): tx is ExecuteTransaction {
  return tx.type === "Execute";
}

export type BundledTransaction = {
  type: "Bundled";
  transactions: (ExecuteTransaction | Transactionish)[] | ExecuteTransaction | Transactionish;
  gasLimit: BigNumber;
};

export function isBundledTransaction(tx: any): tx is BundledTransaction {
  return tx.type === "Bundled";
}

export type InputTransaction = BundledTransaction | ExecuteTransaction | Transactionish[] | Transactionish;

export type SignedTransactions = {
  digest: string;
  chainId: number;
  transactions: Transaction[];
  gasLimit: BigNumber;
  nonce: BigNumber;
  signature: string;
  data: string;
  address: string;
};

export class Wallet extends Signer {
  public address: string;

  public keyset: Keyset;

  public readonly context: UnipassWalletContext = unipassWalletContext;

  public callWallet: WalletEOA;

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

  async signTransactions(
    transaction: Deferrable<InputTransaction>,
    sessionKeyOrSignerIndexes: SessionKey | number[] = [],
    innerNonce?: BigNumber,
    innerGasLimit: BigNumber = constants.Zero,
  ): Promise<SignedTransactions> {
    const txs = await resolveArrayProperties<InputTransaction>(transaction);

    let nonce: BigNumber;
    const moduleMainInterface = new Interface(moduleMain.abi);
    const { chainId } = await this.provider!.getNetwork();
    let digest: string;
    let transactions: Transaction[] = [];
    let signature: string;
    let data: string;
    let address: string;
    let gasLimit: BigNumber;
    if (isBundledTransaction(txs)) {
      let bundledNonce = innerNonce;
      if (bundledNonce === undefined) {
        bundledNonce = BigNumber.from(await this.relayer.getNonce(this.address));
      }
      let transaction: Transaction;
      if (Array.isArray(txs.transactions)) {
        // eslint-disable-next-line no-restricted-syntax
        for (const tx of txs.transactions) {
          // eslint-disable-next-line no-await-in-loop
          [transaction, bundledNonce] = await this.toTransaction(tx, bundledNonce);
          transactions.push(transaction);
        }
      } else {
        [transaction, bundledNonce] = await this.toTransaction(txs.transactions, bundledNonce);
        transactions = [transaction];
      }
      nonce = constants.Zero;
      signature = "0x";
      data = moduleMainInterface.encodeFunctionData("execute", [transactions, 0, "0x"]);
      digest = digestGuestTxHash(chainId, this.context.moduleGuest!, transactions);
      address = this.context.moduleGuest!;
      gasLimit = txs.gasLimit;
    } else if (isExecuteTransaction(txs)) {
      if (Array.isArray(txs.transactions)) {
        transactions = await Promise.all(txs.transactions.map((v) => this.toTransaction(v).then((v) => v[0])));
      } else {
        transactions = [await this.toTransaction(txs.transactions).then((v) => v[0])];
      }
      nonce = innerNonce;
      if (nonce === undefined) {
        nonce = await this.relayer.getNonce(this.address);
      }
      digest = digestTxHash(chainId, this.address, nonce.toNumber(), transactions);
      signature = await this.signMessage(arrayify(digest), txs.sessionKeyOrSignerIndex);
      address = this.address;
      gasLimit = txs.gasLimit;
    } else {
      if (Array.isArray(txs)) {
        transactions = await Promise.all(txs.map((v) => this.toTransaction(v).then((v) => v[0])));
      } else {
        transactions = [await this.toTransaction(txs).then((v) => v[0])];
      }
      nonce = innerNonce;
      if (nonce === undefined) {
        nonce = await this.relayer.getNonce(this.address);
      }
      digest = digestTxHash(chainId, this.address, nonce.toNumber(), transactions);
      signature = await this.signMessage(arrayify(digest), sessionKeyOrSignerIndexes);
      address = this.address;
      gasLimit = innerGasLimit;
    }

    return {
      digest,
      chainId,
      signature,
      nonce,
      data,
      transactions,
      address,
      gasLimit,
    };
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

  async unipassEstimateGas(
    signedTransactions: Pick<SignedTransactions, "transactions" | "nonce" | "signature" | "address">,
    overwrite?: any,
  ): Promise<BigNumber> {
    const executeData = new Interface(moduleMain.abi).encodeFunctionData("execute", [
      signedTransactions.transactions,
      signedTransactions.nonce,
      signedTransactions.signature,
    ]);
    const data = new Interface(gasEstimator.abi).encodeFunctionData("estimate", [
      signedTransactions.address,
      executeData,
    ]);
    const params = [
      {
        from: this.callWallet.address,
        to: this.context.gasEstimator,
        data,
      },
      "latest",
      overwrite,
    ];
    const retBytes = await (this.provider as providers.JsonRpcProvider).send("eth_call", params);
    const [succ, reason, gas] = defaultAbiCoder.decode(["bool", "bytes", "uint256"], retBytes);
    if (!succ) {
      throw new Error(`estimate gas Limit failed: ${reason}`);
    }
    return gas.add(this.txBaseCost(executeData));
  }

  async toTransaction(
    tx: Transactionish | ExecuteTransaction,
    nonce?: BigNumber,
  ): Promise<[Transaction, BigNumber | undefined]> {
    if (isUnipassWalletTransaction(tx)) {
      return [tx, nonce];
    }

    if (isExecuteTransaction(tx)) {
      if (!nonce) {
        throw new Error("Expect Nonce");
      }
      let transactions: Transaction[];
      if (Array.isArray(tx.transactions)) {
        transactions = tx.transactions.map((v) => toTransaction(v));
      } else {
        transactions = [toTransaction(tx.transactions)];
      }
      const sig = await this.signTransactions(transactions, tx.sessionKeyOrSignerIndex, nonce, tx.gasLimit);
      return [
        {
          _isUnipassWalletTransaction: true,
          callType: CallType.Call,
          gasLimit: tx.gasLimit,
          revertOnError: false,
          target: this.address,
          value: constants.Zero,
          data: new Interface(moduleMain.abi).encodeFunctionData("execute", [transactions, nonce, sig.signature]),
        },
        nonce.add(1),
      ];
    }

    return [
      {
        _isUnipassWalletTransaction: true,
        callType: CallType.Call,
        revertOnError: false,
        gasLimit: BigNumber.from(tx.gasLimit),
        target: tx.to,
        value: BigNumber.from(tx.value),
        data: tx.data,
      },
      nonce,
    ];
  }

  async sendTransaction(
    transactions: Deferrable<InputTransaction>,
    sessionKeyOrSignerIndexes: SessionKey | number[] = [],
    feeToken?: string,
    gasLmit: BigNumber = constants.Zero,
  ): Promise<providers.TransactionResponse> {
    const signedTransactions = await this.signTransactions(transactions, sessionKeyOrSignerIndexes, undefined, gasLmit);
    const estimateGas = signedTransactions.gasLimit.eq(0)
      ? await this.unipassEstimateGas(signedTransactions)
      : signedTransactions.gasLimit;
    const call: ExecuteCall = {
      txs: signedTransactions.transactions.map((v) => toUnipassTransaction(v)),
      nonce: signedTransactions.nonce.toHexString(),
      signature: signedTransactions.signature,
    };
    const args: PendingExecuteCallArgs = {
      chainId: hexlify(signedTransactions.chainId),
      txHash: signedTransactions.digest,
      walletAddress: signedTransactions.address,
      estimateGas: estimateGas.toHexString(),
      feeToken,
      call: JSON.stringify(call),
    };
    const hash = await this.relayer.relay(args);
    return {
      hash,
      confirmations: 1,
      from: this.address,
      chainId: signedTransactions.chainId,
      nonce: signedTransactions.nonce.toNumber(),
      gasLimit: estimateGas,
      data: signedTransactions.data,
      value: constants.Zero,
      wait: async (confirmations?: number, timeout: number = 30) => {
        let ret = await this.relayer.wait(hash);
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
        if (confirmations === 0) {
          const receipt: providers.TransactionReceipt = {
            transactionHash: ret.txHash,
            confirmations,
            status: ret.status,
            from: constants.AddressZero,
            to: this.address,
            contractAddress: constants.AddressZero,
            transactionIndex: 0,
            gasUsed: constants.Zero,
            logsBloom: "",
            blockHash: "",
            logs: [],
            blockNumber: 0,
            cumulativeGasUsed: constants.Zero,
            effectiveGasPrice: constants.Zero,
            byzantium: false,
            type: 0,
          };
          return receipt;
        }
        const recipt = await this.provider.waitForTransaction(ret.txHash);
        recipt.status = ret.status;
        return recipt;
      },
    };
  }

  async isSyncKeysetHash(): Promise<boolean> {
    const contract = this.getContract();
    return contract.isValidKeysetHash(this.keyset.hash());
  }

  getContract(): Contract {
    const contract = new Contract(this.address, moduleMain.abi, this.callWallet);

    return contract;
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
