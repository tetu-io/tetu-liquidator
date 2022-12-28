import {ethers} from "hardhat";
import {DeployerUtils} from "../utils/DeployerUtils";
import {UniswapUtils} from "../../test/UniswapUtils";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {
  IERC20__factory,
  IERC20Metadata__factory,
  TetuLiquidator,
  UniswapV2Factory,
  UniswapV2Pair,
  UniswapV2Pair__factory
} from "../../typechain";
import {parseUnits} from "ethers/lib/utils";
import {Misc} from "../utils/Misc";
import {writeFileSync} from "fs";
import {RunHelper} from "../utils/RunHelper";

const TETU = '0x549aE613Bb492CCf68A6620848C80262709a1fb4';
const USDC = '0x27af55366a339393865FC5943C04bc2600F55C9F';
const WBTC = '0x0ed08c9A2EFa93C4bF3C8878e61D2B6ceD89E9d7';
const WETH = '0x078b7c9304eBA754e916016E8A8939527076f991';

async function main() {
  const signer = (await ethers.getSigners())[0];

  const controller = await DeployerUtils.deployController(signer);
  const liquidator = await DeployerUtils.deployTetuLiquidator(signer, controller.address);
  const uniSwapper = await DeployerUtils.deployUni2Swapper(signer, controller.address);

  const uniData = await UniswapUtils.deployUniswapV2(signer, WETH);

  const factory = uniData.factory;
  const weth = uniData.netToken;

  await RunHelper.runAndWait(() => uniSwapper.setFee(factory.address, 300, {gasLimit: 8_000_000}));

  const usdcBtc = await createPair(signer, factory, USDC, WBTC);
  const usdcWeth = await createPair(signer, factory, USDC, weth);
  const btcWeth = await createPair(signer, factory, WBTC, weth);
  const usdcTetu = await createPair(signer, factory, USDC, TETU);

  await addBC(liquidator, usdcBtc, USDC, WBTC, uniSwapper.address);
  await addBC(liquidator, usdcWeth, USDC, weth, uniSwapper.address);
  await addBC(liquidator, btcWeth, WBTC, weth, uniSwapper.address);
  await addPool(liquidator, usdcTetu, USDC, TETU, uniSwapper.address);
  await addPool(liquidator, usdcBtc, WBTC, USDC, uniSwapper.address);
  await addPool(liquidator, usdcWeth, weth, USDC, uniSwapper.address);

  const data = `
  usdc: ${USDC}
  btc: ${WBTC}
  weth: ${weth}
  liquidator: ${liquidator.address}
  factory: ${factory.address}
  uniSwapper: ${uniSwapper.address}
  usdcBtc: ${usdcBtc.address}
  usdcWeth: ${usdcWeth.address}
  btcWeth: ${btcWeth.address}
  usdcTetu: ${usdcTetu.address}
  `
  writeFileSync('tmp/deployed/liquidator.txt', data, 'utf8');
}

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

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
