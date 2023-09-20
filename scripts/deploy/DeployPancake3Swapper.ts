import {ethers} from "hardhat";
import {DeployerUtils} from "../utils/DeployerUtils";
import {writeFileSync} from "fs";

const CONTROLLER = '0x849ecF35f711fFE183838DFdaaDFe105D4C0662a'

async function main() {
  const signer = (await ethers.getSigners())[0];
  const swapper = await DeployerUtils.deployPancake3Swapper(signer, CONTROLLER);
  const data = `
  swapper: ${swapper.address}
  `
  // writeFileSync('tmp/deployed/univ3_swapper.txt', data, 'utf8');
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
