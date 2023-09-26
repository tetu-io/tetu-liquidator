import {ethers} from "hardhat";
import {IERC20Metadata__factory, TetuLiquidator__factory} from "../../typechain";
import {RunHelper} from "../utils/RunHelper";
import {MaticAddresses} from "../addresses/MaticAddresses";


const LIQUIDATOR = '0xC737eaB847Ae6A92028862fE38b828db41314772';
const UNI2_SWAPPER = '0x0089539BeCB82Ab51bc5C76F93Aa61281540fF33';
const DYSTOPIA_SWAPPER = '0x867F88209074f4B7300e7593Cd50C05B2c02Ad01';
const BALANCER_STABLE_SWAPPER = '0xc43e971566B8CCAb815C3E20b9dc66571541CeB4';
const BALANCER_WEIGHTED_SWAPPER = '0x0bcbE4653e96aE39bde24312882faA0EdDF03256';
const BALANCER_COMPOSABLE_SWAPPER = '0xFae1b6961F4a24B8A02AD4B4C66de447c35bf09f';
const UNI3_SWAPPER = '0x7b505210a0714d2a889E41B59edc260Fa1367fFe';
const ALGEBRA_SWAPPER = '0x1d2A0025e7782f640E34Ca5aCCB14e0Ebb96B2f8';
const KYBER_SWAPPER = '0xE1d65E844E41cE02e1d327336446eE6B6630526f';
const BALANCER_LINEAR_SWAPPER = '0xa448329A95970194567fCa4B6B1B0bbA4aC0bF66';

const META: {
  tokenIn: string,
  tokenOut: string,
  pool: string,
  swapper: string,
}[] =
  [
    {
      pool: MaticAddresses.PEARL_CVR_PEARL_POOL,
      swapper: DYSTOPIA_SWAPPER,
      tokenIn: MaticAddresses.CAVIAR_TOKEN,
      tokenOut: MaticAddresses.PEARL_TOKEN,
    },
    {
      pool: MaticAddresses.PEARL_PEARL_USDR_POOL,
      swapper: DYSTOPIA_SWAPPER,
      tokenIn: MaticAddresses.PEARL_TOKEN,
      tokenOut: MaticAddresses.USDR_TOKEN,
    },
    {
      pool: MaticAddresses.PEARL_USDC_USDR_POOL,
      swapper: DYSTOPIA_SWAPPER,
      tokenIn: MaticAddresses.USDC_TOKEN,
      tokenOut: MaticAddresses.USDR_TOKEN,
    },
    {
      pool: MaticAddresses.PEARL_USDC_USDR_POOL,
      swapper: DYSTOPIA_SWAPPER,
      tokenIn: MaticAddresses.USDR_TOKEN,
      tokenOut: MaticAddresses.USDC_TOKEN,
    },
    {
      pool: MaticAddresses.PEARL_wUSDR_USDR_POOL,
      swapper: DYSTOPIA_SWAPPER,
      tokenIn: MaticAddresses.wUSDR_TOKEN,
      tokenOut: MaticAddresses.USDR_TOKEN,
    }
  ]


async function main() {
  const [signer] = await ethers.getSigners();

  const liquidator = TetuLiquidator__factory.connect(LIQUIDATOR, signer);

  const pools: {
    pool: string;
    swapper: string;
    tokenIn: string;
    tokenOut: string;
  }[] = [];
  for (const meta of META) {
    const pool = meta.pool;
    const tokenIn = meta.tokenIn
    const tokenOut = meta.tokenOut
    const swapper = meta.swapper
    // const poolName = await IERC20Metadata__factory.connect(pool, signer).name();
    const tokenInName = await IERC20Metadata__factory.connect(tokenIn, signer).symbol();
    const tokenOutName = await IERC20Metadata__factory.connect(tokenOut, signer).symbol();

    console.log(pool, '||', tokenInName, '=>', tokenOutName);

    pools.push(
      {
        pool,
        swapper,
        tokenIn,
        tokenOut
      }
    );
  }

  await RunHelper.runAndWait(() => liquidator.addLargestPools(pools, true));
}


main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
