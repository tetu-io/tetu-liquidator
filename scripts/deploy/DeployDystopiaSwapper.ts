import {ethers} from "hardhat";
import {DeployerUtils} from "../utils/DeployerUtils";
import {writeFileSync} from "fs";
import {Misc} from "../utils/Misc";

async function main() {
  const signer = (await ethers.getSigners())[0];
  const swapper = await DeployerUtils.deployDystopiaSwapper(signer, Misc.getController());
  const data = `
  swapper: ${swapper.address}
  `
  writeFileSync('tmp/deployed/dyst_swapper.txt', data, 'utf8');
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
