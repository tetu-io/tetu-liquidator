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

const CONTROLLER = '0x286c02C93f3CF48BB759A93756779A1C78bCF833';
const TETU = '0x6678814c273d5088114B6E40cC49C8DB04F9bC29';

async function main() {
  const signer = (await ethers.getSigners())[0];
  const usdc = await DeployerUtils.deployMockToken(signer, 'USDC');
  const btc = await DeployerUtils.deployMockToken(signer, 'BTC');

  const liquidator = await DeployerUtils.deployTetuLiquidator(signer, CONTROLLER);
  const uniSwapper = await DeployerUtils.deployUni2Swapper(signer, CONTROLLER);

  const uniData = await UniswapUtils.deployUniswap(signer);

  const factory = uniData.factory;
  const weth = uniData.netToken;

  await uniSwapper.setFee(factory.address, 300);

  const usdcBtc = await createPair(signer, factory, usdc.address, btc.address);
  const usdcWeth = await createPair(signer, factory, usdc.address, weth);
  const btcWeth = await createPair(signer, factory, btc.address, weth);
  const usdcTetu = await createPair(signer, factory, usdc.address, TETU);

  await addBC(liquidator, usdcBtc, usdc.address, btc.address, uniSwapper.address);
  await addBC(liquidator, usdcWeth, usdc.address, weth, uniSwapper.address);
  await addBC(liquidator, btcWeth, btc.address, weth, uniSwapper.address);
  await addPool(liquidator, usdcTetu, usdc.address, TETU, uniSwapper.address);

  writeFileSync('tmp/deployed/liquidator.txt', liquidator.address, 'utf8');
}

async function addPool(liq: TetuLiquidator, pair: UniswapV2Pair, tokenIn: string, tokenOut: string, swapper: string) {
  await liq.addLargestPools([
    {
      pool: pair.address,
      swapper: Misc.ZERO_ADDRESS,
      tokenIn,
      tokenOut,
    }
  ], false)
}

async function addBC(liq: TetuLiquidator, pair: UniswapV2Pair, tokenIn: string, tokenOut: string, swapper: string) {
  await liq.addBlueChipsPools([
    {
      pool: pair.address,
      swapper: Misc.ZERO_ADDRESS,
      tokenIn,
      tokenOut,
    }
  ], false)
}

async function createPair(signer: SignerWithAddress, factory: UniswapV2Factory, token1: string, token2: string) {
  await factory.createPair(token1, token2);
  const pairAdr = await factory.getPair(token1, token2);
  const pair = UniswapV2Pair__factory.connect(pairAdr, signer);
  await IERC20__factory.connect(token1, signer).transfer(pairAdr, parseUnits('1', await IERC20Metadata__factory.connect(token1, signer).decimals()))
  await IERC20__factory.connect(token2, signer).transfer(pairAdr, parseUnits('2', await IERC20Metadata__factory.connect(token2, signer).decimals()))
  await pair.mint(signer.address);
  return pair;
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
