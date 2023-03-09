import {ethers} from "hardhat";
import {TetuLiquidator__factory} from "../../typechain";
import {RunHelper} from "../utils/RunHelper";
import {MaticAddresses} from "../addresses/MaticAddresses";

const LIQUIDATOR = '0xC737eaB847Ae6A92028862fE38b828db41314772';
const UNI2_SWAPPER = '0x0089539BeCB82Ab51bc5C76F93Aa61281540fF33';
const DYSTOPIA_SWAPPER = '0x867F88209074f4B7300e7593Cd50C05B2c02Ad01';
const BALANCER_STABLE_SWAPPER = '0xc43e971566B8CCAb815C3E20b9dc66571541CeB4';
const BALANCER_WEIGHTED_SWAPPER = '0x0bcbE4653e96aE39bde24312882faA0EdDF03256';
const UNI3_SWAPPER = '0x7b505210a0714d2a889E41B59edc260Fa1367fFe';

const META: {
  pool: string;
  swapper: string;
  tokenIn: string;
  tokenOut: string;
}[] = [
  {
    tokenIn: MaticAddresses.WBTC_TOKEN,
    tokenOut: MaticAddresses.USDC_TOKEN,
    pool: '0x50eaEDB835021E4A108B7290636d62E9765cc6d7',
    swapper: UNI3_SWAPPER,
  },
]

async function main() {
  const [signer] = await ethers.getSigners();

  const liquidator = TetuLiquidator__factory.connect(LIQUIDATOR, signer);

  await RunHelper.runAndWait(() => liquidator.addBlueChipsPools(META, false));
}


main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
