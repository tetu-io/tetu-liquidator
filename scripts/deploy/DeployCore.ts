import {ethers} from "hardhat";
import {DeployerUtils} from "../utils/DeployerUtils";
import {writeFileSync} from "fs";


async function main() {
  const signer = (await ethers.getSigners())[0];

  const controller = await DeployerUtils.deployController(signer);
  const liquidator = await DeployerUtils.deployTetuLiquidator(signer, controller.address);
  const uniSwapper = await DeployerUtils.deployUni2Swapper(signer, controller.address);

  const data = `
  controller: ${controller.address}
  liquidator: ${liquidator.address}
  uniSwapper: ${uniSwapper.address}
  `
  writeFileSync('tmp/deployed/liquidator.txt', data, 'utf8');
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
