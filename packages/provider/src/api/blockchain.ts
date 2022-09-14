import { providers } from "ethers";
import { Deployer } from "@unipasswallet/sdk";

const generateAccountAddress = async (keysetHash: string, provider: providers.JsonRpcProvider): Promise<string> => {
  try {
    const deployer = await new Deployer(provider.getSigner()).init();
    const address = deployer.getProxyContractAddress(
      // TODO import address
      "0x86407827c875a69F6A2dfa00d50dd4F2Da24ac66",
      keysetHash,
    );

    return address;
  } catch {
    return "";
  }
};

export default { generateAccountAddress };
