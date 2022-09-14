import { providers } from "ethers";
import { Deployer } from "@unipasswallet/sdk";

const generateAccountAddress = async (keysetHash: string, provider: providers.JsonRpcProvider): Promise<string> => {
  try {
    const deployer = await new Deployer(provider.getSigner()).init();
    const address = deployer.getProxyContractAddress(
      // TODO import address
      "0x32ab2e39ca105b1718f805413FB01C1d94b939ae",
      keysetHash,
    );

    return address;
  } catch {
    return "";
  }
};

export default { generateAccountAddress };
