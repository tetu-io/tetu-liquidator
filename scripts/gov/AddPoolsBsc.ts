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

const TOKENS = [
  "0x55d398326f99059ff775485246999027b3197955",
];

const POOLS = [
  "0x7EFaEf62fDdCCa950418312c6C91Aef321375A00",
];

const SWAPPERS = [
  UNI2_SWAPPER,
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
    const poolName = await IERC20Metadata__factory.connect(pool, signer).symbol();
    const tokenInName = await IERC20Metadata__factory.connect(tokenIn, signer).symbol();

    const token0 = await IUniswapV2Pair__factory.connect(pool, signer).token0();
    const token1 = await IUniswapV2Pair__factory.connect(pool, signer).token1();

    const tokenOut = token0.toLowerCase() === tokenIn.toLowerCase() ? token1 : token0;

    console.log(pool, poolName, '||', tokenInName, '||', await IERC20Metadata__factory.connect(tokenOut, signer).symbol());

    pools.push(
      {
        pool,
        swapper,
        tokenIn,
        tokenOut
      }
    );
  }

  await RunHelper.runAndWait(() => liquidator.addLargestPools(pools, false));
}


main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
