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
import {
  Relayer,
  PendingExecuteCallArgs,
  ExecuteCall,
  TxnReceiptResult,
  SimulateResult,
  SimulateKey,
  SimulateExecute,
} from "@unipasswallet/relayer";
import { MAINNET_UNIPASS_WALLET_CONTEXT, UnipassWalletContext } from "@unipasswallet/network";
import { moduleMain, gasEstimator } from "@unipasswallet/abi";
import { Transaction, digestTxHash, CallType } from "@unipasswallet/transactions";
import { SingletonFactoryAddress, SingletonFactoryInterface, CreationCode, getWalletCode } from "@unipasswallet/utils";
import { SessionKey } from "./sessionKey";
import { MainExecuteTransaction } from "./mainExecuteTransaction";
import { RawMainExecuteTransaction } from "./rawMainExecuteTransaction";
import { RawMainExecuteCall } from "./rawMainExecuteCall";
import { RawBundledExecuteCall } from "./rawBundledExecuteCall";
import { BundledExecuteCall } from "./bundledExecuteCall";
import { MainExecuteCall } from "./mainExecuteCall";

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

  public readonly context: UnipassWalletContext = MAINNET_UNIPASS_WALLET_CONTEXT;

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

    // FIX ME: use faked private key cost less time than create random key
    this.callWallet = new WalletEOA("593f6bd6d96d75627e3d3b446ee16339cc5c45060d2fed97f913b8b158594035", this.provider);
  }

  static create(options: WalletOptions): Wallet {
    const createOptions = options;

    const { keyset, context = MAINNET_UNIPASS_WALLET_CONTEXT } = createOptions;

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

  async getNonce(): Promise<BigNumber> {
    return this.relayer.getNonce(this.address);
  }

  async signRawMainExecuteCall(
    rawExecute: RawMainExecuteCall,
    chainId: number,
    nonce: BigNumber,
  ): Promise<{ execute: MainExecuteCall; nonce }> {
    nonce = nonce.add(1);
    if (!(await rawExecute.preSignFunc(chainId, this.address, rawExecute.txs, nonce))) {
      throw new Error(
        `Pre signing Failed For ChainID[${chainId}], address[${this.address}], nonce[${nonce}], txs[${rawExecute.txs}]`,
      );
    }
    const txHash = digestTxHash(chainId, this.address, nonce.toNumber(), rawExecute.txs);
    const signature = await this.signMessage(arrayify(txHash), rawExecute.sessionKeyOrSignerIndexes);
    return { execute: new MainExecuteCall(rawExecute.txs, nonce, signature), nonce };
  }

  async signRawBundledExecuteCall(
    rawExecute: RawBundledExecuteCall,
    chainId: number,
    nonce: BigNumber,
  ): Promise<{ execute: BundledExecuteCall; nonce }> {
    const { txs, nonce: newNonce } = await rawExecute.txs.reduce(async (prePromise, tx) => {
      const { txs, nonce } = await prePromise;
      if (RawMainExecuteTransaction.isRawMainExecuteTransaction(tx)) {
        const newNonce = nonce.add(1);
        const execute = tx.rawExecuteCall;
        if (!(await execute.preSignFunc(chainId, this.address, execute.txs, newNonce))) {
          throw new Error(
            `Pre signing Failed For ChainID[${chainId}], address[${this.address}], nonce[${newNonce}], txs[${rawExecute.txs}]`,
          );
        }
        const txHash = digestTxHash(chainId, this.address, newNonce.toNumber(), execute.txs);
        const signature = await this.signMessage(arrayify(txHash), execute.sessionKeyOrSignerIndexes);
        txs.push(
          new MainExecuteTransaction({
            executeCall: new MainExecuteCall(execute.txs, newNonce, signature),
            ...tx.opts(),
          }).toTransaction(),
        );
        return { txs, nonce: newNonce };
      }
      txs.push(tx);
      return { txs, nonce };
    }, Promise.resolve({ nonce, txs: <Transaction[]>[] }));
    nonce = newNonce;
    return { execute: new BundledExecuteCall(txs), nonce };
  }

  async signTransactions(
    rawExecute: RawMainExecuteCall | RawBundledExecuteCall,
  ): Promise<{ execute: BundledExecuteCall | MainExecuteCall; chainId: number; nonce: BigNumber }> {
    const { chainId } = await this.provider.getNetwork();
    const nonce = await this.getNonce();
    if (nonce === constants.Zero) {
      throw new Error(`Wallet [${this.address}] Has Not Deployed`);
    }

    if (RawMainExecuteCall.isRawMainExecuteCall(rawExecute)) {
      const signedExecute = await this.signRawMainExecuteCall(rawExecute, chainId, nonce);
      return { ...signedExecute, chainId };
    }
    const signedExecute = await this.signRawBundledExecuteCall(rawExecute, chainId, nonce);
    return { ...signedExecute, chainId };
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
    overwrite: any = {},
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

  public target(execute: MainExecuteCall | BundledExecuteCall | RawBundledExecuteCall | RawMainExecuteCall): string {
    if (MainExecuteCall.isMainExecuteCall(execute) || RawMainExecuteCall.isRawMainExecuteCall(execute)) {
      return this.address;
    }
    return this.context.moduleGuest;
  }

  async sendTransactions(
    rawExecute: RawMainExecuteCall | RawBundledExecuteCall,
  ): Promise<providers.TransactionResponse> {
    const { execute, chainId, nonce } = await this.signTransactions(rawExecute);

    const call: ExecuteCall = execute.toExecuteCall();
    const args: PendingExecuteCallArgs = {
      call: JSON.stringify(call),
      walletAddress: this.target(execute),
    };
    const hash = await this.relayer.relay(args);
    return {
      hash,
      confirmations: 1,
      from: this.address,
      chainId,
      nonce: nonce.toNumber(),
      gasLimit: constants.Zero,
      data: execute.ethAbiEncode(),
      value: constants.Zero,
      wait: async (confirmations?: number, timeout: number = 30) => {
        return this.waitForTransaction(hash, confirmations, timeout);
      },
    };
  }

  async waitForTransaction(
    txHash: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _confirmations: number = 1,
    timeout: number,
  ): Promise<providers.TransactionReceipt> {
    let ret: TxnReceiptResult;
    let i = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      if (i < timeout) {
        // eslint-disable-next-line no-await-in-loop
        ret = await this.relayer.wait(txHash);
        if (ret && ret.receipt) {
          break;
        }
        // eslint-disable-next-line no-await-in-loop, no-promise-executor-return
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } else {
        return Promise.reject(new Error("Timeout Error"));
      }
      i++;
    }
    const { receipt } = ret;

    return receipt;
  }

  async isSyncKeysetHash(): Promise<boolean> {
    const contract = this.getContract();
    return contract.isValidKeysetHash(this.keyset.hash());
  }

  getContract(): Contract {
    const contract = new Contract(this.address, moduleMain.abi, this.callWallet);

    return contract;
  }

  async simulateExecute(execute: RawBundledExecuteCall | RawMainExecuteCall, token?: string): Promise<SimulateResult> {
    const target = this.target(execute);
    const simulateExecute: SimulateExecute = execute.toSimulateExecute();
    const keyset: SimulateKey[] = this.keyset.keys.map((key) => {
      const keyType = key.keyType();
      return {
        keyType,
        ownerRoleWeight: key.roleWeight.ownerWeight,
        assetsopRoleWeight: key.roleWeight.assetsOpWeight,
        guardianRoleWeight: key.roleWeight.guardianWeight,
      };
    });

    return this.relayer.simulate(target, keyset, simulateExecute, token);
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
