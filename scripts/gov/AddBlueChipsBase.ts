import {ethers} from "hardhat";
import {readFileSync} from "fs";
import {
  IERC20__factory,
  IERC20Metadata__factory,
  TetuLiquidator,
  TetuLiquidator__factory,
  IUniswapV2Pair, IUniswapV2Pair__factory
} from "../../typechain";
import {Misc} from "../utils/Misc";
import {RunHelper} from "../utils/RunHelper";
import {BaseAddresses} from "../addresses/BaseAddresses";

const LIQUIDATOR = '0x22e2625F9d8c28CB4BcE944E9d64efb4388ea991';
const UNI2_SWAPPER = '0x286c02C93f3CF48BB759A93756779A1C78bCF833';
const UNI3_SWAPPER = '0x00379dD90b2A337C4652E286e4FBceadef940a21';
const CURVE128_SWAPPER = '0x03fD3aE2758aB37E8692e1844e0692e9B058C735';
const CURVE256_SWAPPER = '0x57205cC741f8787a5195B2126607ac505E11B650';

const META: {
  tokenIn: string,
  tokenOut: string,
  pool: string,
  swapper: string,
}[] =
  [
    {
      pool: BaseAddresses.UNI3_USDbC_ETH_POOL,
      swapper: BaseAddresses.UNI3_SWAPPER,
      tokenIn: BaseAddresses.USDbC_TOKEN,
      tokenOut: BaseAddresses.WETH_TOKEN,
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

  await RunHelper.runAndWait(() => liquidator.addBlueChipsPools(pools, true));
}


main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
