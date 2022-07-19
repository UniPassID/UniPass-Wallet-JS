import { Contract, ContractFactory, ethers, Wallet } from "ethers";
import { Interface, randomBytes } from "ethers/lib/utils";

import ModuleMainArtifact from "../../../artifacts/unipass-wallet-contracts/contracts/modules/ModuleMain.sol/ModuleMain.json";
import FactoryArtifact from "../../../artifacts/unipass-wallet-contracts/contracts/Factory.sol/Factory.json";
import DkimKeysArtifact from "../../../artifacts/unipass-wallet-contracts/contracts/DkimKeys.sol/DkimKeys.json";
import { Config } from "../../../tests/config";
import {
  CallTxBuilder,
  UpdateKeysetHashTxBuilder,
} from "../src/transactionBuilder";
import {
  generateRecoveryEmails,
  getKeysetHash,
  getProxyAddress,
  optimalGasLimit,
} from "./utils/common";
import {
  MasterKeySigGenerator,
  SessionKeySigGenerator,
  SignType,
} from "../src/sigGenerator";
import { RecoveryEmails } from "../src/recoveryEmails";
import { TxExcutor } from "../src/txExecutor";

describe("Test ModuleMain", () => {
  let moduleMain: Contract;
  let ModuleMain: ContractFactory;
  let provider: ethers.providers.JsonRpcProvider;
  let proxyModuleMain: Contract;
  let factory: Contract;
  let dkimKeys: Contract;
  let masterKey: Wallet;
  let keysetHash: string;
  let threshold: number;
  let recoveryEmails: string[];
  let dkimKeysAdmin: Wallet;
  let chainId: number;
  beforeAll(async () => {
    provider = new ethers.providers.JsonRpcProvider(Config.JSONRPC_NODE);
    chainId = (await provider.getNetwork()).chainId;
    const Factory = new ContractFactory(
      new Interface(FactoryArtifact.abi),
      FactoryArtifact.bytecode,
      provider.getSigner()
    );
    factory = await Factory.deploy();
    const DkimKeys = new ContractFactory(
      new Interface(DkimKeysArtifact.abi),
      DkimKeysArtifact.bytecode,
      provider.getSigner()
    );
    dkimKeysAdmin = Wallet.createRandom();
    dkimKeys = await DkimKeys.deploy(dkimKeysAdmin.address);
    ModuleMain = new ContractFactory(
      new Interface(ModuleMainArtifact.abi),
      ModuleMainArtifact.bytecode,
      provider.getSigner()
    );
  });
  beforeEach(async () => {
    moduleMain = await ModuleMain.deploy(factory.address);
    threshold = 4;
    masterKey = Wallet.createRandom();

    recoveryEmails = generateRecoveryEmails(10);
    keysetHash = getKeysetHash(masterKey.address, threshold, recoveryEmails);

    const ret = await (
      await factory.deploy(moduleMain.address, keysetHash, dkimKeys.address)
    ).wait();
    expect(ret.status).toEqual(1);

    const expectedAddress = getProxyAddress(
      moduleMain.address,
      dkimKeys.address,
      factory.address,
      keysetHash
    );
    proxyModuleMain = ModuleMain.attach(expectedAddress);
    const txRet = await provider.getSigner().sendTransaction({
      to: proxyModuleMain.address,
      value: ethers.utils.parseEther("100"),
    });
    expect((await txRet.wait()).status).toEqual(1);
    expect(await proxyModuleMain.getKeysetHash()).toEqual(keysetHash);
  });
  it("Updating KeysetHash Should Success", async () => {
    const newKeysetHash = Buffer.from(randomBytes(32));
    const txBuilder = new UpdateKeysetHashTxBuilder(
      proxyModuleMain.address,
      2,
      newKeysetHash
    );
    const masterKeySigGenerator = new MasterKeySigGenerator(
      masterKey,
      new RecoveryEmails(threshold, recoveryEmails)
    );
    const tx = (
      await txBuilder.generateSigByMasterKey(
        masterKeySigGenerator,
        SignType.EthSign
      )
    ).build();
    const txExecutor = await new TxExcutor(
      chainId,
      1,
      [tx],
      ethers.constants.AddressZero,
      ethers.constants.Zero,
      ethers.constants.AddressZero
    ).generateSigByMasterKey(masterKeySigGenerator, SignType.EthSign);
    const ret = await (
      await txExecutor.execute(proxyModuleMain, optimalGasLimit)
    ).wait();
    expect(ret.status).toEqual(1);
    expect(await proxyModuleMain.getKeysetHash()).toEqual(
      `0x${newKeysetHash.toString("hex")}`
    );
  });
  it("Transfer Should Success", async () => {
    const tx = new CallTxBuilder(
      ethers.constants.Zero,
      dkimKeysAdmin.address,
      ethers.utils.parseEther("10"),
      "0x"
    ).build();
    const masterKeySigGenerator = new MasterKeySigGenerator(
      masterKey,
      new RecoveryEmails(threshold, recoveryEmails)
    );
    const sessoinKey = Wallet.createRandom();
    const sessionKeySigGenerator = await new SessionKeySigGenerator(
      sessoinKey,
      Math.ceil(Date.now() / 1000) + 1000,
      new RecoveryEmails(threshold, recoveryEmails)
    ).init(masterKeySigGenerator, SignType.EthSign);
    const txExecutor = await new TxExcutor(
      chainId,
      1,
      [tx],
      ethers.constants.AddressZero,
      ethers.constants.Zero,
      ethers.constants.AddressZero
    ).generateSigBySessionKey(sessionKeySigGenerator, SignType.EthSign);

    const ret = await (
      await txExecutor.execute(proxyModuleMain, optimalGasLimit)
    ).wait();
    expect(ret.status).toEqual(1);
    expect(
      Number.parseInt(
        ethers.utils.formatEther(
          await provider.getBalance(dkimKeysAdmin.address)
        ),
        10
      )
    ).toEqual(10);
  });
});
