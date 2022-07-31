import {ethers} from "hardhat";
import {
  IERC20Metadata__factory,
  IUniswapV2Pair__factory,
  TetuLiquidator__factory
} from "../../typechain";
import {RunHelper} from "../utils/RunHelper";


const LIQUIDATOR = '0xC737eaB847Ae6A92028862fE38b828db41314772';
const UNI2_SWAPPER = '0x0089539BeCB82Ab51bc5C76F93Aa61281540fF33';
const DYSTOPIA_SWAPPER = '0x867F88209074f4B7300e7593Cd50C05B2c02Ad01';

const TOKENS = [
  "0x39aB6574c289c3Ae4d88500eEc792AB5B947A5Eb",
];

const POOLS = [
  "0x1e08A5B6A1694bC1A65395db6f4c506498DAA349",
];

const SWAPPERS = [
  DYSTOPIA_SWAPPER,
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
