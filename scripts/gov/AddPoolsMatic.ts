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

const POOLS = [
  "0x80ff4e4153883d770204607eb4af9994739c72dc",
  "0x853ee4b2a13f8a742d64c8f088be7ba2131f670d",
  "0xb5846453b67d0b4b4ce655930cf6e4129f4416d7",
  "0x6e7a5fafcec6bb1e78bae2a1f0b612012bf14827",
  "0x853ee4b2a13f8a742d64c8f088be7ba2131f670d",
  "0xf04adbf75cdfc5ed26eea4bbbb991db002036bdd",
  "0x019ba0325f1988213d448b3472fa1cf8d07618d7",
  "0xac48153f3604318f9559224931b541755ae8ae6e",
  "0x84c6b5b5cb47f117ff442c44d25e379e06df5d8a",
  "0xdc9232e2df177d7a12fdff6ecbab114e2231198d",
  "0xf6422b997c7f54d1c6a6e103bcb1499eea0a7046",
  "0x2a574629ca405fa43a8f21faa64ff73dd320f45b",
  "0x5786b267d35f9d011c4750e0b0ba584e1fdbead1",
  "0xbcdd0e38f759f8c07d8416df15d0b3e0f9146d08",
  "0x9a8b2601760814019b7e6ee0052e25f1c623d1e6",
  "0xe8f56b590ea274d5d451f786c3270af764f1b793",
  "0x160532d2536175d65c03b97b0630a9802c274dad",
  "0xabca7538233cbe69709c004c52dc37e61c03796b",
  "0xc67136e235785727a0d3b5cfd08325327b81d373",
  "0x74d23f21f780ca26b47db16b0504f2e3832b9321",
  "0xcf40352253de7a0155d700a937dc797d681c9867"
];

const TOKENS = [
  "0x255707b70bf90aa112006e1b07b9aea6de021424",
  "0x2791bca1f2de4661ed88a30c99a7a9449aa84174",
  "0x0b3f868e0be5597d5db7feb59e1cadbb0fdda50a",
  "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
  "0x7ceb23fd6bc0add59e62ac25578270cff1b9f619",
  "0x8f3cf7ad23cd3cadbd9735aff958023239c6a063",
  "0x831753dd7087cac61ab5644b308642cc1c33dc13",
  "0x82362ec182db3cf7829014bc61e9be8a2e82868a",
  "0x08c15fa26e519a78a666d19ce5c646d55047e0a3",
  "0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6",
  "0xc2132d05d31c914a87c6611c10748aeb04b58e8f",
  "0xab0b2ddb9c7e440fac8e140a89c0dbcbf2d7bbff",
  "0x4e78011ce80ee02d2c3e649fb657e45898257815",
  "0x4cd44ced63d9a6fef595f6ad3f7ced13fceac768",
  "0x580a84c73811e1839f75d86d75d88cca0c241ff4",
  "0xc46db78be28b5f2461097ed9e3fcc92e9ff8676d",
  "0xa3fa99a148fa48d14ed51d610c367c61876997f1",
  "0x3066818837c5e6ed6601bd5a91b0762877a6b731",
  "0x9a71012b13ca4d3d0cdc72a177df3ef03b0e76a3",
  "0x53e0bca35ec356bd5dddfebbd1fc0fd03fabad39",
  "0xdcb8f34a3ceb48782c9f3f98df6c12119c8d168a"
];

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
  for (let i = 0; i < POOLS.length; i++) {
    const pool = POOLS[i];
    const tokenIn = TOKENS[i]
    const poolName = await IERC20Metadata__factory.connect(pool, signer).symbol();
    const tokenInName = await IERC20Metadata__factory.connect(tokenIn, signer).symbol();


    const token0 = await IUniswapV2Pair__factory.connect(pool, signer).token0();
    const token1 = await IUniswapV2Pair__factory.connect(pool, signer).token1();

    const tokenOut = token0.toLowerCase() === tokenIn.toLowerCase() ? token1 : token0;

    console.log(pool, poolName,'||', tokenInName,'||', await IERC20Metadata__factory.connect(tokenOut, signer).symbol());

    pools.push(
      {
        pool,
        swapper: UNI2_SWAPPER,
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
