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
  "0x2cf7252e74036d1da831d11089d326296e64a728",
  "0xf04adbf75cdfc5ed26eea4bbbb991db002036bdd",
  "0x853ee4b2a13f8a742d64c8f088be7ba2131f670d",
  "0x6e7a5fafcec6bb1e78bae2a1f0b612012bf14827",
  "0xf6a637525402643b0654a54bead2cb9a83c8b498",
  "0xf6422b997c7f54d1c6a6e103bcb1499eea0a7046",
  "0x604229c960e5cacf2aaeac8be68ac07ba9df81c3",
  "0x4a35582a710e1f4b2030a3f826da20bfb6703c09",
  "0xadbf1854e5883eb8aa7baf50705338739e558e5b",
  "0xdc9232e2df177d7a12fdff6ecbab114e2231198d"
]

const LIQUIDATOR = '0xC737eaB847Ae6A92028862fE38b828db41314772';
const UNI2_SWAPPER = '0x0089539BeCB82Ab51bc5C76F93Aa61281540fF33';

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
