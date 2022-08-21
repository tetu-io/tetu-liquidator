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
  "0x58f876857a02d6762e0101bb5c46a8c1ed44dc16", // bnb/busd
  "0x7efaef62fddcca950418312c6c91aef321375a00", // usdt/busd
  "0x74e4716e431f45807dcf19f284c7aa99f18a4fbc", // eth/bnb
  "0xd99c7f6c65857ac913a8f880a4cb84032ab2fc5b", // usdc/bnb
]

const LIQUIDATOR = '0xcE9F7173420b41678320cd4BB93517382b6D48e8';
const UNI2_SWAPPER = '0xD37fC11dEDfaa0fc3449b2BF5eDe864Ef6AaE1E3';
const DYSTOPIA_SWAPPER = '0xECc1B6f004d4A04017a6eDc1A02f222f4ea7cad2';

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
