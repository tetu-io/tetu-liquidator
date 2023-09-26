import hre, {ethers} from "hardhat";
import {IERC20Metadata__factory, TetuLiquidator__factory} from "../../typechain";
import {RunHelper} from "../utils/RunHelper";
import {EthAddresses} from "../addresses/EthAddresses";
import {Misc} from "../utils/Misc";


const LIQUIDATOR = '0x90351d15F036289BE9b1fd4Cb0e2EeC63a9fF9b0';
const UNI2_SWAPPER = '0x96cee247B587c19D5570dae254d57958e92D75f0';
const BALANCER_STABLE_SWAPPER = '0xa4320b575e86cFa06379B8eD8C76d9149A30F948';
const BALANCER_WEIGHTED_SWAPPER = '0x7eFC54ED20E32EA76497CB241c7E658E3B29B04B';
const UNI3_SWAPPER = '0x708137a379D2bC067F6553396AD528FF9a00f1D3';


const META: {
  tokenIn: string,
  tokenOut: string,
  pool: string,
  swapper: string,
}[] = [
  {
    tokenIn: '0x8290333ceF9e6D528dD5618Fb97a76f268f3EDD4',
    tokenOut: EthAddresses.WETH_TOKEN,
    pool: '0x13dC0a39dc00F394E030B97b0B569dedBe634c0d',
    swapper: UNI3_SWAPPER,
  },
]


async function main() {
  let signer;
  if (hre.network.name === 'hardhat') {
    signer = await Misc.impersonate()
  } else {
    signer = (await ethers.getSigners())[0];
  }

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
