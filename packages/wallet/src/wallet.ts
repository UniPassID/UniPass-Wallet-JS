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
  parseEther,
  defaultAbiCoder,
} from "ethers/lib/utils";
import { Keyset, RoleWeight } from "@unipasswallet/keys";
import { Relayer, PendingExecuteCallArgs, ExecuteCall } from "@unipasswallet/relayer";
import { unipassWalletContext, UnipassWalletContext } from "@unipasswallet/network";
import { moduleMain, gasEstimator } from "@unipasswallet/abi";
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
  ): Promise<SignedTransactions> {
    const { chainId } = await this.provider!.getNetwork();
    const nonce = BigNumber.from(await this.relayer.getNonce(this.address)).toNumber();

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

    return this.getExecuteSignedTransaction(transactions, sessionKeyOrSignerIndexes);
  }

  async sendTransaction(
    transaction: Deferrable<Transactionish>,
    sessionKeyOrSignerIndexes: SessionKey | number[] | "BUNDLED" = [],
  ): Promise<providers.TransactionResponse> {
    const signedTransactions = await this.signTransactions(transaction, sessionKeyOrSignerIndexes);

    let args: PendingExecuteCallArgs;

    const { chainId } = await this.provider!.getNetwork();
    const moduleMainInterface = new Interface(moduleMain.abi);

    let nonce: BigNumber;
    let estimateGas: BigNumber;
    let data: string;

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
      estimateGas = await this.provider.estimateGas({
        to: this.address,
        data,
        gasLimit: parseEther("0.1"),
      });
      args = {
        chainId: hexlify(chainId),
        txHash: hexlify(signedTransactions.txHash),
        walletAddress: this.address,
        estimateGas: estimateGas.toHexString(),
        call: JSON.stringify(call),
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
      estimateGas = await this.provider.estimateGas({
        to: this.context.moduleGuest,
        data,
        gasLimit: parseEther("0.1"),
      });

      args = {
        chainId: hexlify(chainId),
        txHash: hexlify(signedTransactions.txHash),
        walletAddress: this.context.moduleGuest,
        estimateGas: estimateGas.toHexString(),
        call: JSON.stringify(call),
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
    const txs = transactions;
    if (this.provider instanceof providers.JsonRpcProvider) {
      const gasLimits = await Promise.all(
        [...txs.keys()].map(async (index) => {
          const data = new Interface(gasEstimator.abi).encodeFunctionData("estimate", [
            this.address,
            new Interface(moduleMain.abi).encodeFunctionData("execute", [transactions.slice(0, index), 0, "0x"]),
          ]);

          const params = [
            {
              from: this.address,
              to: this.context.gasEstimator,
              data,
            },
            "latest",
          ];
          const retBytes = await (this.provider as providers.JsonRpcProvider).send("eth_call", params);
          const [, , gas] = defaultAbiCoder.decode(["bool", "bytes", "uint256"], retBytes);
          return gas;
        }),
      );

      gasLimits.reduce((pre, current, i) => {
        if (!txs[i].revertOnError && txs[i].gasLimit.eq(constants.Zero) && txs[i].callType === CallType.Call) {
          txs[i].gasLimit = current.sub(pre);
        }
        return current;
      }, 0);

      return txs;
    }
    return Promise.reject(new Error("Expect JsonRpcProvider"));
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
