import {ethers} from "hardhat";
import {IERC20Metadata__factory, TetuLiquidator__factory} from "../../typechain";
import {RunHelper} from "../utils/RunHelper";
import {MaticAddresses} from "../addresses/MaticAddresses";



const LIQUIDATOR = '0xC737eaB847Ae6A92028862fE38b828db41314772';
const UNI2_SWAPPER = '0x0089539BeCB82Ab51bc5C76F93Aa61281540fF33';
const DYSTOPIA_SWAPPER = '0x867F88209074f4B7300e7593Cd50C05B2c02Ad01';
const BALANCER_STABLE_SWAPPER = '0xc43e971566B8CCAb815C3E20b9dc66571541CeB4';
const BALANCER_WEIGHTED_SWAPPER = '0x0bcbE4653e96aE39bde24312882faA0EdDF03256';
const UNI3_SWAPPER = '0x8E6079615Bc2F7dAB35202cDfa2aA78AD3aF4629';

const META: {
  tokenIn: string,
  tokenOut: string,
  pool: string,
  swapper: string,
}[] = [
  {
    tokenIn: MaticAddresses.LIDO_TOKEN,
    tokenOut: MaticAddresses.WMATIC_TOKEN,
    pool: '0xd866fac7db79994d08c0ca2221fee08935595b4b',
    swapper: UNI3_SWAPPER,
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
