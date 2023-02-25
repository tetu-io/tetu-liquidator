import {ethers} from "hardhat";
import {
  IERC20Metadata__factory,
  IUniswapV2Pair__factory,
  TetuLiquidator__factory
} from "../../typechain";
import {RunHelper} from "../utils/RunHelper";
import {EthAddresses} from "../addresses/EthAddresses";


const LIQUIDATOR = '0x90351d15F036289BE9b1fd4Cb0e2EeC63a9fF9b0';
const UNI2_SWAPPER = '0x96cee247B587c19D5570dae254d57958e92D75f0';
const BALANCER_STABLE_SWAPPER = '0xa4320b575e86cFa06379B8eD8C76d9149A30F948';
const BALANCER_WEIGHTED_SWAPPER = '0x7eFC54ED20E32EA76497CB241c7E658E3B29B04B';


const META: {
  tokenIn: string,
  tokenOut: string,
  pool: string,
  swapper: string,
}[] = [
  {
    tokenIn: EthAddresses.wUSDR_TOKEN,
    tokenOut: EthAddresses.USDC_TOKEN,
    pool: '0x831261f44931b7da8ba0dcc547223c60bb75b47f',
    swapper: BALANCER_STABLE_SWAPPER,
  },
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
    const poolName = await IERC20Metadata__factory.connect(pool, signer).name();
    const tokenInName = await IERC20Metadata__factory.connect(tokenIn, signer).symbol();
    const tokenOutName = await IERC20Metadata__factory.connect(tokenOut, signer).symbol();

    console.log(pool, poolName, '||', tokenInName, '=>', tokenOutName);

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
