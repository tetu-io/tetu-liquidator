import {ethers} from "hardhat";
import {DeployerUtils} from "../utils/DeployerUtils";
import {writeFileSync} from "fs";

const CONTROLLER = '0x943c56C23992b16B3D95B0C481D8fb7727e31ea8'

async function main() {
  const signer = (await ethers.getSigners())[0];
  const swapper = await DeployerUtils.deployCurveSwapper256(signer, CONTROLLER);
  const data = `
  swapper: ${swapper.address}
  `
  writeFileSync('tmp/deployed/curve256_swapper.txt', data, 'utf8');
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
