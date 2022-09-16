import {
  BigNumber,
  BytesLike,
  Contract,
  ContractFactory,
  ContractInterface,
  Overrides,
  Signer,
  utils,
} from "ethers";
import { keccak256 } from "ethers/lib/utils";
import {
  CreationCode,
  SingletonFactoryAddress,
  SingletonFactoryInterface,
  getAddressDeployedBySingletonFactory,
  isContractDeployed,
} from "@unipasswallet/utils";
import { Transaction } from "@ethereumjs/tx";

export class Deployer {
  public readonly singleFactoryContract: Contract;

  constructor(private _signer: Signer) {
    this.singleFactoryContract = new Contract(
      SingletonFactoryAddress,
      SingletonFactoryInterface,
      _signer
    );

    if (this._signer.provider === undefined) {
      throw new Error("Expected Provider");
    }
  }

  public get signer(): Signer {
    return this._signer;
  }

  public set signer(v: Signer) {
    this._signer = v;
  }

  public async init(): Promise<Deployer> {
    await this.deployEip2470();

    return this;
  }

  public async deployEip2470() {
    let ret;

    if (
      await isContractDeployed(
        this.singleFactoryContract.address,
        this._signer.provider!
      )
    ) {
      return;
    }
    const balance = await this._signer.provider.getBalance(
      "0xBb6e024b9cFFACB947A71991E386681B1Cd1477D"
    );

    if (balance < utils.parseEther("0.0247")) {
      const value = utils.parseEther("0.0247").sub(balance);
      ret = await (
        await this.signer.sendTransaction({
          value,
          to: "0xBb6e024b9cFFACB947A71991E386681B1Cd1477D",
        })
      ).wait();

      if (ret.status !== 1) {
        const error: any = new Error("Transfer Eth Failed");
        error.ret = ret;
        throw error;
      }
    }
    const tx = new Transaction({
      nonce: 0,
      gasPrice: 100000000000,
      value: 0,
      data: "0x608060405234801561001057600080fd5b50610134806100206000396000f3fe6080604052348015600f57600080fd5b506004361060285760003560e01c80634af63f0214602d575b600080fd5b60cf60048036036040811015604157600080fd5b810190602081018135640100000000811115605b57600080fd5b820183602082011115606c57600080fd5b80359060200191846001830284011164010000000083111715608d57600080fd5b91908080601f016020809104026020016040519081016040528093929190818152602001838380828437600092019190915250929550509135925060eb915050565b604080516001600160a01b039092168252519081900360200190f35b6000818351602085016000f5939250505056fea26469706673582212206b44f8a82cb6b156bfcc3dc6aadd6df4eefd204bc928a4397fd15dacf6d5320564736f6c63430006020033",
      gasLimit: 247000,
      v: 27,
      r: "0x247000",
      s: "0x2470",
    });
    ret = await (
      await this._signer.provider.sendTransaction(
        `0x${tx.serialize().toString("hex")}`
      )
    ).wait();

    if (ret.status !== 1) {
      const error: any = new Error("Deploy Contract Failed");
      error.ret = ret;
      throw error;
    }

    if (
      !(await isContractDeployed(
        SingletonFactoryAddress,
        this._signer.provider!
      ))
    ) {
      const error: any = new Error("Contract Deployed Failed");
      error.ret = ret;
      throw error;
    }
  }

  public static getInitCode(addr: BytesLike): string {
    return utils.solidityPack(["bytes", "uint256"], [CreationCode, addr]);
  }

  public async deployContract<T extends ContractFactory>(
    contractFactory: T,
    instance: number,
    txParams: Overrides,
    ...args: Parameters<T["deploy"]>
  ): Promise<Contract> {
    const deployTx = await contractFactory.getDeployTransaction(...args);

    if (deployTx.data === undefined) {
      throw new Error("Expected Data For Deploy Tx");
    }
    const salt = utils.hexZeroPad(BigNumber.from(instance).toHexString(), 32);
    const deployedContractAddr = getAddressDeployedBySingletonFactory(
      salt,
      keccak256(deployTx.data)
    );

    if (
      await isContractDeployed(deployedContractAddr, this._signer.provider!)
    ) {
      return new Contract(
        deployedContractAddr,
        contractFactory.interface,
        this.signer
      );
    }
    const ret = await (
      await this.singleFactoryContract.deploy(deployTx.data, salt, txParams)
    ).wait();

    if (ret.status !== 1) {
      const error: any = new Error("Deploy Contract Failed");
      error.ret = ret;
      throw error;
    }

    if (
      !(await isContractDeployed(deployedContractAddr, this._signer.provider!))
    ) {
      const error: any = new Error(
        `Contract Deployed Failed: ${JSON.stringify(ret)}`
      );
      error.ret = ret;
      throw error;
    }

    return new Contract(
      deployedContractAddr,
      contractFactory.interface,
      this.signer
    );
  }

  public async deployProxyContract(
    contractInterface: ContractInterface,
    contractAddr: BytesLike,
    salt: string,
    txParams: Overrides
  ): Promise<Contract> {
    const initCode = Deployer.getInitCode(contractAddr);
    const deployedContractAddr = getAddressDeployedBySingletonFactory(
      salt,
      keccak256(initCode)
    );

    if (
      await isContractDeployed(deployedContractAddr, this._signer.provider!)
    ) {
      return new Contract(deployedContractAddr, contractInterface, this.signer);
    }
    const ret = await (
      await this.singleFactoryContract.deploy(initCode, salt, txParams)
    ).wait();

    if (ret.status !== 1) {
      const error: any = new Error("Deploy Contract Failed");
      error.ret = ret;
      throw error;
    }

    if (
      !(await isContractDeployed(deployedContractAddr, this._signer.provider!))
    ) {
      const error: any = new Error("Contract Deployed Failed");
      error.ret = ret;
      throw error;
    }

    return new Contract(deployedContractAddr, contractInterface, this.signer);
  }
}
