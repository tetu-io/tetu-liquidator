import {ethers} from "hardhat";
import {
  IERC20Metadata__factory,
  IUniswapV2Pair__factory,
  TetuLiquidator__factory
} from "../../typechain";
import {RunHelper} from "../utils/RunHelper";


const LIQUIDATOR = '0xcE9F7173420b41678320cd4BB93517382b6D48e8';
const UNI2_SWAPPER = '0xD37fC11dEDfaa0fc3449b2BF5eDe864Ef6AaE1E3';
const DYSTOPIA_SWAPPER = '0xECc1B6f004d4A04017a6eDc1A02f222f4ea7cad2';
const PANCAKE_V_3_SWAPPER = '0x5413E7AFCADCB63A30Dad567f46dd146Cc427801';

const TOKENS = [
  "0xcF6BB5389c92Bdda8a3747Ddb454cB7a64626C63",
  "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c",
  "0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3",
];

const POOLS = [
  "0x7EB5D86FD78f3852a3e0e064f2842d45a3dB6EA2",
  "0xD4dCA84E1808da3354924cD243c66828cf775470",
  "0xe0caab61EE7A12d03B268E1f6A56537aC1b61D13",
];

const SWAPPERS = [
  UNI2_SWAPPER,
  PANCAKE_V_3_SWAPPER,
  UNI2_SWAPPER
];


async function main() {
  const [signer] = await ethers.getSigners();

  const liquidator = TetuLiquidator__factory.connect(LIQUIDATOR, signer);

  const pools: {
    pool: string;
    swapper: string;
    tokenIn: string;
    tokenOut: string;
  }[] = [];
  for (let i = 0; i < POOLS.length; i++) {
    const pool = POOLS[i];
    const tokenIn = TOKENS[i]
    const swapper = SWAPPERS[i]
    // const poolName = await IERC20Metadata__factory.connect(pool, signer).symbol();
    const tokenInName = await IERC20Metadata__factory.connect(tokenIn, signer).symbol();

    const token0 = await IUniswapV2Pair__factory.connect(pool, signer).token0();
    const token1 = await IUniswapV2Pair__factory.connect(pool, signer).token1();

    const tokenOut = token0.toLowerCase() === tokenIn.toLowerCase() ? token1 : token0;

    console.log(pool, '||', tokenInName, '||', await IERC20Metadata__factory.connect(tokenOut, signer).symbol());

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
