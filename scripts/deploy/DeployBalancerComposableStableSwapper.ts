import {ethers} from "hardhat";
import {DeployerUtils} from "../utils/DeployerUtils";
import {writeFileSync, mkdirSync} from "fs";
import {Misc} from "../utils/Misc";

const BALANCER_VAULT = '0xba12222222228d8ba445958a75a0704d566bf2c8';

async function main() {
  const signer = (await ethers.getSigners())[0];
  const swapper = await DeployerUtils.deployBalancerComposableStablePoolSwapper(
    signer, Misc.getController(), BALANCER_VAULT
  );
  const data = `
  swapper: ${swapper.address}
  `
  const targetDir = 'tmp/deployed/';
  mkdirSync(targetDir, { recursive: true });
  writeFileSync(targetDir+'balancer_composable_stable_swapper.txt', data, 'utf8');
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
