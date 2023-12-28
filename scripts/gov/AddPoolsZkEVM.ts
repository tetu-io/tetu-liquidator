import {ethers} from "hardhat";
import {IERC20Metadata__factory, TetuLiquidator__factory} from "../../typechain";
import {RunHelper} from "../utils/RunHelper";
import {MaticAddresses} from "../addresses/MaticAddresses";
import {BaseAddresses} from "../addresses/BaseAddresses";


const LIQUIDATOR = '0xBcda73B7184D5974F77721db79ff8BA190b342ce';


const META: {
  tokenIn: string,
  tokenOut: string,
  pool: string,
  swapper: string,
}[] =
  [
    {
      pool: '0x9591b8A30c3a52256ea93E98dA49EE43Afa136A8', // ZkevmAddresses.ALGEBRA_POOL_USDT_USDC
      swapper: '0x4C1EEeF74862ed6524B416809636821FBFff208C', // ZkevmAddresses.TETU_LIQUIDATOR_ALGEBRA_SWAPPER
      tokenIn: '0x1E4a5963aBFD975d8c9021ce480b42188849D41d', // ZkevmAddresses.USDT_TOKEN
      tokenOut: '0xA8CE8aee21bC2A48a5EF670afCc9274C7bbbC035', // ZkevmAddresses.USDC_TOKEN
    }, {
    pool: '0xc44AD482f24fd750cAeBa387d2726d8653F8c4bB', // ZkevmAddresses.ALGEBRA_POOL_WETH_USDC
    swapper: '0x4C1EEeF74862ed6524B416809636821FBFff208C', // ZkevmAddresses.TETU_LIQUIDATOR_ALGEBRA_SWAPPER
    tokenIn: '0x4F9A0e7FD2Bf6067db6994CF12E4495Df938E6e9', // ZkevmAddresses.WETH_TOKEN
    tokenOut: '0xA8CE8aee21bC2A48a5EF670afCc9274C7bbbC035', // ZkevmAddresses.USDC_TOKEN
  }, {
    pool: '0x4412c7152c658967a3360F0A1472E701bDBeca9E', // ZkevmAddresses.ALGEBRA_POOL_USDT_WETH
    swapper: '0x4C1EEeF74862ed6524B416809636821FBFff208C', // ZkevmAddresses.TETU_LIQUIDATOR_ALGEBRA_SWAPPER
    tokenIn: '0x1E4a5963aBFD975d8c9021ce480b42188849D41d', // ZkevmAddresses.USDT_TOKEN
    tokenOut: '0x4F9A0e7FD2Bf6067db6994CF12E4495Df938E6e9', // ZkevmAddresses.WETH_TOKEN
  }, {
    pool: '0x3Fa1c450f3842C1252e4cB443e3F435b41D6f472', // ZkevmAddresses.PANCAKE_POOL_CAKE_WETH_10000     We can use PANCAKE_POOL_CAKE_WETH_2500 instead: 0x58684788c718D0CfeC837ff65ADDA6C8721FE1e9
    swapper: '0xa075F8FF74941Fae5bf9Fd48736E4422474A5A66', // ZkevmAddresses.TETU_LIQUIDATOR_PANCAKE_V3_SWAPPER
    tokenIn: '0x0d1e753a25ebda689453309112904807625befbe', // ZkevmAddresses.PANCAKE_SWAP_TOKEN
    tokenOut: '0x4F9A0e7FD2Bf6067db6994CF12E4495Df938E6e9', // ZkevmAddresses.WETH_TOKEN
  }, {
    pool: '0x7bB24BDF5f16c71FA67b0734416D6730C5a694bf', // ZkevmAddresses.PANCAKE_POOL_TETU_USDC_100
    swapper: '0xa075F8FF74941Fae5bf9Fd48736E4422474A5A66', // ZkevmAddresses.TETU_LIQUIDATOR_PANCAKE_V3_SWAPPER
    tokenIn: '0x7C1B24c139a3EdA18Ab77C8Fa04A0F816C23e6D4', // ZkevmAddresses.TETU_TOKEN
    tokenOut: '0xA8CE8aee21bC2A48a5EF670afCc9274C7bbbC035', // ZkevmAddresses.USDC_TOKEN
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

  await RunHelper.runAndWait2(liquidator.populateTransaction.addLargestPools(pools, true));
}


main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
