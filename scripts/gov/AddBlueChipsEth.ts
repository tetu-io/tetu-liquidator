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
  "0xb4e16d0168e52d35cacd2c6185b44281ec28c9dc", // usdc/eth
  "0xae461ca67b15dc8dc81ce7615e0320da1a9ab8d5", // usdc/dai
  "0x0d4a11d5eeaac28ec3f61d100daf4d40471f1852", // eth/usdt
]

const LIQUIDATOR = '0x90351d15F036289BE9b1fd4Cb0e2EeC63a9fF9b0';
const UNI2_SWAPPER = '0x96cee247B587c19D5570dae254d57958e92D75f0';

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
    const name = await IERC20Metadata__factory.connect(bcAdr, signer).name();
    const token0 = await IUniswapV2Pair__factory.connect(bcAdr, signer).token0();
    const token1 = await IUniswapV2Pair__factory.connect(bcAdr, signer).token1();
    console.log(bcAdr, name);
    pools.push(
      {
        pool: bcAdr,
        swapper: UNI2_SWAPPER,
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
