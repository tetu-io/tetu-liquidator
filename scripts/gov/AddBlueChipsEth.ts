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

const bc = [
  "0x99ac8cA7087fA4A2A1FB6357269965A2014ABc35", // usdc/wbtc
]

const LIQUIDATOR = '0x90351d15F036289BE9b1fd4Cb0e2EeC63a9fF9b0';
const UNI2_SWAPPER = '0x96cee247B587c19D5570dae254d57958e92D75f0';
const UNI3_SWAPPER = '0x708137a379D2bC067F6553396AD528FF9a00f1D3';

async function main() {
  const [signer] = await ethers.getSigners();

  const liquidator = TetuLiquidator__factory.connect(LIQUIDATOR, signer);

  const pools: {
    pool: string;
    swapper: string;
    tokenIn: string;
    tokenOut: string;
  }[] = [];
  for (const bcAdr of bc) {
    // const name = await IERC20Metadata__factory.connect(bcAdr, signer).name();
    const token0 = await IUniswapV2Pair__factory.connect(bcAdr, signer).token0();
    const token1 = await IUniswapV2Pair__factory.connect(bcAdr, signer).token1();
    // console.log(bcAdr, name);
    pools.push(
      {
        pool: bcAdr,
        swapper: UNI3_SWAPPER,
        tokenIn: token0,
        tokenOut: token1
      }
    );
  }

  await RunHelper.runAndWait(() => liquidator.addBlueChipsPools(pools, false));
}


main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
