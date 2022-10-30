import {ethers} from "hardhat";
import {
  IERC20__factory,
  IERC20Metadata__factory, ITetuLiquidator__factory,
  TetuLiquidator, TetuLiquidator__factory,
  UniswapV2Factory,
  UniswapV2Factory__factory,
  UniswapV2Pair, UniswapV2Pair__factory
} from "../../typechain";
import {RunHelper} from "../utils/RunHelper";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {Misc} from "../utils/Misc";
import {parseUnits} from "ethers/lib/utils";


const TOKEN_IN = '0x88a12B7b6525c0B46c0c200405f49cE0E72D71Aa';
const TOKEN_OUT = '0x308A756B4f9aa3148CaD7ccf8e72c18C758b2EF2';

const FACTORY = '0xB6Ca119F30B3E7F6589F8a053c2a10B753846e78';
const LIQUIDATOR = '0x3bdbd2ed1a214ca4ba4421ddd7236cca3ef088b6';
const UNI_SWAPPER = '0xF9E426dF37D75875b136d9D25CB9f27Ee9E43C4f';

async function main() {
  const signer = (await ethers.getSigners())[0];

  // const pair = await createPair(signer, UniswapV2Factory__factory.connect(FACTORY, signer), TOKEN_IN, TOKEN_OUT);

  // await addBC(TetuLiquidator__factory.connect(LIQUIDATOR, signer), pair, TOKEN0, TOKEN1, UNI_SWAPPER);
  await addPool(TetuLiquidator__factory.connect(LIQUIDATOR, signer), UniswapV2Pair__factory.connect('0x58639D7ab0E26373205B9f54585c719a3F652650', signer), TOKEN_IN, TOKEN_OUT, UNI_SWAPPER);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });

async function addPool(liq: TetuLiquidator, pair: UniswapV2Pair, tokenIn: string, tokenOut: string, swapper: string) {
  await RunHelper.runAndWait(() => liq.addLargestPools([
    {
      pool: pair.address,
      swapper,
      tokenIn,
      tokenOut,
    }
  ], false, {gasLimit: 8_000_000}))
}

async function addBC(liq: TetuLiquidator, pair: UniswapV2Pair, tokenIn: string, tokenOut: string, swapper: string) {
  await RunHelper.runAndWait(() => liq.addBlueChipsPools([
    {
      pool: pair.address,
      swapper,
      tokenIn,
      tokenOut,
    }
  ], false, {gasLimit: 8_000_000}))
}

async function createPair(signer: SignerWithAddress, factory: UniswapV2Factory, token1: string, token2: string) {
  console.log('create pair')
  await RunHelper.runAndWait(() => factory.createPair(token1, token2, {gasLimit: 8_000_000}));
  await Misc.wait(1)
  const pairAdr = await factory.getPair(token1, token2);
  console.log('pair', pairAdr)
  const pair = UniswapV2Pair__factory.connect(pairAdr, signer);
  const dec0 = await IERC20Metadata__factory.connect(token1, signer).decimals()
  const dec1 = await IERC20Metadata__factory.connect(token2, signer).decimals()
  await RunHelper.runAndWait(() => IERC20__factory.connect(token1, signer).transfer(pairAdr, parseUnits('1', dec0), {gasLimit: 8_000_000}))
  await RunHelper.runAndWait(() => IERC20__factory.connect(token2, signer).transfer(pairAdr, parseUnits('2', dec1), {gasLimit: 8_000_000}))
  await RunHelper.runAndWait(() => pair.mint(signer.address, {gasLimit: 8_000_000}));
  return pair;
}
