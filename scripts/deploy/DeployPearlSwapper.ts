import {ethers} from "hardhat";
import {DeployerUtils} from "../utils/DeployerUtils";

const CONTROLLER = '0x943c56C23992b16B3D95B0C481D8fb7727e31ea8'

async function main() {
  const signer = (await ethers.getSigners())[0];
  const swapper = await DeployerUtils.deployPearlSwapper(signer, CONTROLLER);
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
