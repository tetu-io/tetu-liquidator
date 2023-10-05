import {ethers} from "hardhat";
import {DeployerUtils} from "../utils/DeployerUtils";
import {Misc} from "../utils/Misc";

async function main() {
  const signer = (await ethers.getSigners())[0];
  const swapper = await DeployerUtils.deployKyberSwapper(signer, Misc.getController());
  const data = `
  swapper: ${swapper.address}
  `
  console.log(data)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
