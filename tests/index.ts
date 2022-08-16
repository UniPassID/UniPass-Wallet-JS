import { Wallet } from "ethers";

async function main() {
  const wallet = await Wallet.createRandom();
  console.log(await wallet.encrypt("password"));
}

main();
