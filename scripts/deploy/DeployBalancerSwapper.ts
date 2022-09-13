import {ethers} from "hardhat";
import {DeployerUtils} from "../utils/DeployerUtils";
import {writeFileSync} from "fs";

const CONTROLLER = '0x6678814c273d5088114B6E40cC49C8DB04F9bC29'; // Polygon
const BALANCER_VAULT = '0xba12222222228d8ba445958a75a0704d566bf2c8'; // Polygon

async function main() {
  const signer = (await ethers.getSigners())[0];
  const swapper = await DeployerUtils.deployBalancerSwapper(signer, CONTROLLER, BALANCER_VAULT);
  const data = `
  swapper: ${swapper.address}
  `
  writeFileSync('tmp/deployed/balancer_swapper.txt', data, 'utf8');
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
