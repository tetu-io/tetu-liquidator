import {ethers} from "hardhat";
import {DeployerUtils} from "../utils/DeployerUtils";
import {UniswapUtils} from "../../test/UniswapUtils";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {
  IERC20__factory,
  IERC20Metadata__factory, MockToken, TetuLiquidator,
  UniswapV2Factory, UniswapV2Pair,
  UniswapV2Pair__factory
} from "../../typechain";
import {parseUnits} from "ethers/lib/utils";
import {Misc} from "../utils/Misc";
import {writeFileSync} from "fs";
import {RunHelper} from "../utils/RunHelper";
import {TimeUtils} from "../../test/TimeUtils";

const CONTROLLER = '0x81367059892aa1D8503a79a0Af9254DD0a09afBF';
const TETU = '0x00379dD90b2A337C4652E286e4FBceadef940a21';

async function main() {
  const signer = (await ethers.getSigners())[0];
  // const signer = await Misc.impersonate('0xbbbbb8C4364eC2ce52c59D2Ed3E56F307E529a94');
  const usdc = await DeployerUtils.deployMockToken(signer, 'USDC');
  const btc = await DeployerUtils.deployMockToken(signer, 'BTC');

  const liquidator = await DeployerUtils.deployTetuLiquidator(signer, CONTROLLER);
  const uniSwapper = await DeployerUtils.deployUni2Swapper(signer, CONTROLLER);

  const uniData = await UniswapUtils.deployUniswap(signer);

  const factory = uniData.factory;
  const weth = uniData.netToken;

  await RunHelper.runAndWait(() => uniSwapper.setFee(factory.address, 300, {gasLimit: 8_000_000}));

  const usdcBtc = await createPair(signer, factory, usdc.address, btc.address);
  const usdcWeth = await createPair(signer, factory, usdc.address, weth);
  const btcWeth = await createPair(signer, factory, btc.address, weth);
  const usdcTetu = await createPair(signer, factory, usdc.address, TETU);

  await addBC(liquidator, usdcBtc, usdc.address, btc.address, uniSwapper.address);
  await addBC(liquidator, usdcWeth, usdc.address, weth, uniSwapper.address);
  await addBC(liquidator, btcWeth, btc.address, weth, uniSwapper.address);
  await addPool(liquidator, usdcTetu, usdc.address, TETU, uniSwapper.address);

  writeFileSync('tmp/deployed/usdc.txt', usdc.address, 'utf8');
  writeFileSync('tmp/deployed/btc.txt', btc.address, 'utf8');
  writeFileSync('tmp/deployed/weth.txt', weth, 'utf8');
  writeFileSync('tmp/deployed/liquidator.txt', liquidator.address, 'utf8');
}

async function addPool(liq: TetuLiquidator, pair: UniswapV2Pair, tokenIn: string, tokenOut: string, swapper: string) {
  await RunHelper.runAndWait(() => liq.addLargestPools([
    {
      pool: pair.address,
      swapper: Misc.ZERO_ADDRESS,
      tokenIn,
      tokenOut,
    }
  ], false, {gasLimit: 8_000_000}))
}

async function addBC(liq: TetuLiquidator, pair: UniswapV2Pair, tokenIn: string, tokenOut: string, swapper: string) {
  await RunHelper.runAndWait(() => liq.addBlueChipsPools([
    {
      pool: pair.address,
      swapper: Misc.ZERO_ADDRESS,
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
