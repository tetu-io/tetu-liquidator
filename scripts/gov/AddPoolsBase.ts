import {ethers} from "hardhat";
import {IERC20Metadata__factory, TetuLiquidator__factory} from "../../typechain";
import {RunHelper} from "../utils/RunHelper";
import {MaticAddresses} from "../addresses/MaticAddresses";
import {BaseAddresses} from "../addresses/BaseAddresses";


const LIQUIDATOR = '0x22e2625F9d8c28CB4BcE944E9d64efb4388ea991';
const UNI2_SWAPPER = '0x286c02C93f3CF48BB759A93756779A1C78bCF833';
const UNI3_SWAPPER = '0x00379dD90b2A337C4652E286e4FBceadef940a21';
const CURVE128_SWAPPER = '0x03fD3aE2758aB37E8692e1844e0692e9B058C735';
const CURVE256_SWAPPER = '0x57205cC741f8787a5195B2126607ac505E11B650';
const DYSTOPIA_SWAPPER = '0x1d2664F6376294D9852CC710a2f3f77532BA3Ba2';

const POOL_WETH_WELL_VOLATILE_AMM = "0xffA3F8737C39e36dec4300B162c2153c67c8352f";
const UNISWAPV3_USDC_USDbC_100 = '0x06959273E9A65433De71F5A452D529544E07dDD0'.toLowerCase()
const UNISWAPV3_DAI_USDbC_100 = '0x22F9623817F152148B4E080E98Af66FBE9C5AdF8'.toLowerCase()


const META: {
  tokenIn: string,
  tokenOut: string,
  pool: string,
  swapper: string,
}[] =
  [
    {
      pool: POOL_WETH_WELL_VOLATILE_AMM,
      swapper: DYSTOPIA_SWAPPER,
      tokenIn: BaseAddresses.WELL_TOKEN,
      tokenOut: BaseAddresses.WETH_TOKEN
    },
    {
      pool: POOL_WETH_WELL_VOLATILE_AMM,
      swapper: DYSTOPIA_SWAPPER,
      tokenIn: BaseAddresses.WETH_TOKEN,
      tokenOut: BaseAddresses.WELL_TOKEN
    },
    {
      pool: UNISWAPV3_USDC_USDbC_100,
      swapper: UNI3_SWAPPER,
      tokenIn: BaseAddresses.USDC_TOKEN,
      tokenOut: BaseAddresses.USDbC_TOKEN
    },
    {
      pool: UNISWAPV3_DAI_USDbC_100,
      swapper: UNI3_SWAPPER,
      tokenIn: BaseAddresses.DAI_TOKEN,
      tokenOut: BaseAddresses.USDbC_TOKEN
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

  await RunHelper.runAndWait(() => liquidator.addLargestPools(pools, true));
}


main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
