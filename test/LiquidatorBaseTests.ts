import {ethers} from "hardhat";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {expect} from "chai";
import {DeployerUtils} from "../scripts/utils/DeployerUtils";
import {TimeUtils} from "./TimeUtils";
import {
  Controller,
  IERC20__factory,
  IERC20Metadata__factory, IUniswapV2Pair__factory,
  MockToken,
  TetuLiquidator,
  UniswapV2Factory,
  UniswapV2Pair,
  UniswapV2Pair__factory
} from "../typechain";
import {parseUnits} from "ethers/lib/utils";
import {Misc} from "../scripts/utils/Misc";
import {UniswapUtils} from "./UniswapUtils";


describe("Liquidator base Tests", function () {
  let snapshotBefore: string;
  let snapshot: string;
  let signer: SignerWithAddress;
  let signer2: SignerWithAddress;
  let controller: Controller;
  let liquidator: TetuLiquidator;
  let factory: UniswapV2Factory;

  let usdc: MockToken;
  let tetu: MockToken;

  let tetuUsdc: UniswapV2Pair;

  before(async function () {
    snapshotBefore = await TimeUtils.snapshot();
    [signer, signer2] = await ethers.getSigners();
    controller = await DeployerUtils.deployController(signer);

    liquidator = await DeployerUtils.deployTetuLiquidator(signer, controller.address);

    const uniData = await DeployerUtils.deployUniswap(signer);
    factory = uniData.factory;

    usdc = await DeployerUtils.deployMockToken(signer, 'USDC', 6);
    tetu = await DeployerUtils.deployMockToken(signer, 'TETU');

    tetuUsdc = await createPair(signer, factory, usdc.address, tetu.address);

  });

  after(async function () {
    await TimeUtils.rollback(snapshotBefore);
  });


  beforeEach(async function () {
    snapshot = await TimeUtils.snapshot();
  });

  afterEach(async function () {
    await TimeUtils.rollback(snapshot);
  });

  it("add exist route revert", async () => {
    await liquidator.addLargestPools([
      {
        pool: tetuUsdc.address,
        swapper: Misc.ZERO_ADDRESS,
        tokenIn: tetu.address,
        tokenOut: usdc.address,
      }
    ], false);
    await expect(liquidator.addLargestPools([
      {
        pool: tetuUsdc.address,
        swapper: Misc.ZERO_ADDRESS,
        tokenIn: tetu.address,
        tokenOut: usdc.address,
      }
    ], false)).revertedWith('L: Exist');
  });

  it("add exist bc revert", async () => {
    await liquidator.addBlueChipsPools([
      {
        pool: tetuUsdc.address,
        swapper: Misc.ZERO_ADDRESS,
        tokenIn: tetu.address,
        tokenOut: usdc.address,
      }
    ], false);
    await expect(liquidator.addBlueChipsPools([
      {
        pool: tetuUsdc.address,
        swapper: Misc.ZERO_ADDRESS,
        tokenIn: tetu.address,
        tokenOut: usdc.address,
      }
    ], false)).revertedWith('L: Exist');
  });

  it("add pool from not owner revert", async () => {
    await expect(liquidator.connect(signer2).addLargestPools([
      {
        pool: tetuUsdc.address,
        swapper: Misc.ZERO_ADDRESS,
        tokenIn: tetu.address,
        tokenOut: usdc.address,
      }
    ], false)).revertedWith('DENIED');
  });

  it("add bc from not owner revert", async () => {
    await expect(liquidator.connect(signer2).addBlueChipsPools([
      {
        pool: tetuUsdc.address,
        swapper: Misc.ZERO_ADDRESS,
        tokenIn: tetu.address,
        tokenOut: usdc.address,
      }
    ], false)).revertedWith('DENIED');
  });

  it("isRouteExist test", async () => {
    expect(await liquidator.isRouteExist(tetu.address, usdc.address)).eq(false);
  });

  it("isRouteExist gas", async () => {
    expect(await liquidator.estimateGas.isRouteExist(tetu.address, usdc.address)).below(67719);
  });

  it("liquidate univ2 test", async () => {
    const usdcBal = await usdc.balanceOf(signer.address);
    const swapper = await DeployerUtils.deployUni2Swapper(signer, controller.address);
    await swapper.setFee(factory.address, 300);
    await liquidator.addLargestPools([{
      pool: tetuUsdc.address,
      swapper: swapper.address,
      tokenIn: tetu.address,
      tokenOut: usdc.address,
    }], false);
    await tetu.approve(liquidator.address, Misc.MAX_UINT);
    await liquidator.liquidate(tetu.address, usdc.address, parseUnits('0.1'), 10_000);
    const usdcBalAfter = await usdc.balanceOf(signer.address);
    expect(usdcBalAfter.sub(usdcBal)).eq(47482);
  });

  it("liquidate univ2 with predefined route test", async () => {
    const usdcBal = await usdc.balanceOf(signer.address);
    const swapper = await DeployerUtils.deployUni2Swapper(signer, controller.address);
    await swapper.setFee(factory.address, 300);
    await liquidator.addLargestPools([{
      pool: tetuUsdc.address,
      swapper: swapper.address,
      tokenIn: tetu.address,
      tokenOut: usdc.address,
    }], false);
    await tetu.approve(liquidator.address, Misc.MAX_UINT);
    const data = await liquidator.buildRoute(tetu.address, usdc.address);
    await liquidator.liquidateWithRoute(data.route, parseUnits('0.1'), 10_000);
    const usdcBalAfter = await usdc.balanceOf(signer.address);
    expect(usdcBalAfter.sub(usdcBal)).eq(47482);
  });

  it("liquidate zero route revert", async () => {
    await expect(liquidator.liquidateWithRoute([], parseUnits('0.1'), 10_000)).revertedWith('ZERO_LENGTH');
  });

  it("liquidate no route revert", async () => {
    await expect(liquidator.liquidate(tetu.address, usdc.address, parseUnits('0.1'), 10_000)).revertedWith('L: Not found pool for tokenIn');
  });

  it("getPrice no route zero price test", async () => {
    expect(await liquidator.getPrice(tetu.address, usdc.address, 0)).eq(0);
  });

  it("liquidate univ2 with complex route test", async () => {
    const matic = await DeployerUtils.deployMockToken(signer, 'WMATIC');
    const maticUsdc = await createPair(signer, factory, usdc.address, matic.address);

    const bal = await matic.balanceOf(signer.address);
    const swapper = await DeployerUtils.deployUni2Swapper(signer, controller.address);
    await swapper.setFee(factory.address, 300);

    await liquidator.addLargestPools([{
      pool: tetuUsdc.address,
      swapper: swapper.address,
      tokenIn: tetu.address,
      tokenOut: usdc.address,
    }], false);

    await liquidator.addLargestPools([{
      pool: maticUsdc.address,
      swapper: swapper.address,
      tokenIn: matic.address,
      tokenOut: usdc.address,
    }], false);

    await tetu.approve(liquidator.address, Misc.MAX_UINT);
    await liquidator.liquidate(tetu.address, matic.address, parseUnits('0.1'), 10_000);
    const balAfter = await matic.balanceOf(signer.address);
    expect(balAfter.sub(bal)).above(parseUnits('0.08'));
  });

  it("get price univ2 with complex route test", async () => {
    const matic = await DeployerUtils.deployMockToken(signer, 'WMATIC');
    const maticUsdc = await createPair(signer, factory, usdc.address, matic.address);
    const swapper = await DeployerUtils.deployUni2Swapper(signer, controller.address);

    await liquidator.addLargestPools([{
      pool: tetuUsdc.address,
      swapper: swapper.address,
      tokenIn: tetu.address,
      tokenOut: usdc.address,
    }], false);

    await liquidator.addBlueChipsPools([{
      pool: maticUsdc.address,
      swapper: swapper.address,
      tokenIn: matic.address,
      tokenOut: usdc.address,
    }], false);


    const priceTetuUsdc = await liquidator.getPrice(tetu.address, usdc.address, parseUnits('1'));
    const priceTetuMatic = await liquidator.getPrice(tetu.address, matic.address, 0);
    const priceUsdcMatic = await liquidator.getPrice(usdc.address, matic.address, 0);
    const priceMaticUsdc = await liquidator.getPrice(matic.address, usdc.address, 0);
    expect(priceTetuUsdc).eq(parseUnits('0.333333', 6));
    expect(priceTetuMatic).eq(parseUnits('0.499999624999906249'));
    expect(priceUsdcMatic).eq(parseUnits('1'));
    expect(priceMaticUsdc).eq(parseUnits('0.333333', 6));

    const route = await liquidator.buildRoute(tetu.address, usdc.address);
    const priceTetuUsdcFromRoute = await liquidator.getPriceForRoute(route.route, 0);
    const priceTetuUsdcFromRoute2 = await liquidator.getPriceForRoute(route.route, parseUnits('1'));
    expect(priceTetuUsdc).eq(priceTetuUsdcFromRoute);
    expect(priceTetuUsdc).eq(priceTetuUsdcFromRoute2);
  });

  describe("Tests for getPriceWithImpact, priceOut", () => {
    it("simple route, getPrice gives the same price", async () => {
      const swapper = await DeployerUtils.deployUni2Swapper(signer, controller.address);
      await swapper.setFee(factory.address, 300);
      await liquidator.addLargestPools([{
        pool: tetuUsdc.address,
        swapper: swapper.address,
        tokenIn: tetu.address,
        tokenOut: usdc.address,
      }], false);
      const amountToSwap = parseUnits('0.1');
      const price = await liquidator.getPrice(tetu.address, usdc.address, amountToSwap);
      const ret = await liquidator.getPriceWithImpact(tetu.address, usdc.address, amountToSwap);
      expect(ret.priceOut.toString()).eq(price.toString());
    });
    it("complex route, getPrice gives the same price", async () => {
      const matic = await DeployerUtils.deployMockToken(signer, 'WMATIC');
      const maticUsdc = await createPair(signer, factory, usdc.address, matic.address);

      const swapper = await DeployerUtils.deployUni2Swapper(signer, controller.address);
      await swapper.setFee(factory.address, 300);

      await liquidator.addLargestPools([{
        pool: tetuUsdc.address,
        swapper: swapper.address,
        tokenIn: tetu.address,
        tokenOut: usdc.address,
      }], false);

      await liquidator.addLargestPools([{
        pool: maticUsdc.address,
        swapper: swapper.address,
        tokenIn: matic.address,
        tokenOut: usdc.address,
      }], false);
      const amountToSwap = parseUnits('0.1');
      const price = await liquidator.getPrice(tetu.address, matic.address, amountToSwap);
      const ret = await liquidator.getPriceWithImpact(tetu.address, matic.address, amountToSwap);
      expect(ret.priceOut.toString()).eq(price.toString());
    });
  });
  describe("Tests for getPriceWithImpact, priceImpactOut", () => {
    it("simple route, swapper gives the same price-impact-out", async () => {
      const swapper = await DeployerUtils.deployUni2Swapper(signer, controller.address);
      await swapper.setFee(factory.address, 300);
      await liquidator.addLargestPools([{
        pool: tetuUsdc.address,
        swapper: swapper.address,
        tokenIn: tetu.address,
        tokenOut: usdc.address,
      }], false);
      const amountToSwap = parseUnits('10000');
      const {priceImpactOut} = await swapper.getPriceWithImpact(tetuUsdc.address, tetu.address, usdc.address, amountToSwap);
      const ret = await liquidator.getPriceWithImpact(tetu.address, usdc.address, amountToSwap);
      expect(ret.priceImpactOut.toString()).eq(priceImpactOut.toString());
    });
    it("complex route, price-impact-out is calculated as expected", async () => {
      const matic = await DeployerUtils.deployMockToken(signer, 'WMATIC');
      const maticUsdc = await createPair(signer, factory, usdc.address, matic.address);

      const swapper = await DeployerUtils.deployUni2Swapper(signer, controller.address);
      await swapper.setFee(factory.address, 300);

      await liquidator.addLargestPools([{
        pool: tetuUsdc.address,
        swapper: swapper.address,
        tokenIn: tetu.address,
        tokenOut: usdc.address,
      }], false);

      await liquidator.addLargestPools([{
        pool: maticUsdc.address,
        swapper: swapper.address,
        tokenIn: matic.address,
        tokenOut: usdc.address,
      }], false);
      const amountToSwap = parseUnits('500');

      // Suppose, we have a route with 3 steps, each step has 10% of price impact
      // Result price impact is following: 10 + 90*0.1 + 81*0.1 = 27.1%
      const retTetuUsdc = await swapper.getPriceWithImpact(tetuUsdc.address, tetu.address, usdc.address, amountToSwap);
      const retUsdcMatic = await swapper.getPriceWithImpact(maticUsdc.address, usdc.address, matic.address, retTetuUsdc.amountOut);
      const priceImpactDenominator = parseUnits('1', 5);
      const expectedPriceImpact = retTetuUsdc.priceImpactOut.add(
        priceImpactDenominator.sub(retTetuUsdc.priceImpactOut).mul(retUsdcMatic.priceImpactOut).div(priceImpactDenominator)
      );
      const ret = await liquidator.getPriceWithImpact(tetu.address, matic.address, amountToSwap);
      expect(ret.priceImpactOut.toString()).eq(expectedPriceImpact.toString());
    });
    it("complex route: make swap, predicted price impact as same as real one", async () => {
      const matic = await DeployerUtils.deployMockToken(signer, 'WMATIC');
      const maticUsdc = await createPair(signer, factory, usdc.address, matic.address);

      const balanceBefore = await matic.balanceOf(signer.address);
      const swapper = await DeployerUtils.deployUni2Swapper(signer, controller.address);
      await swapper.setFee(factory.address, 300);

      await liquidator.addLargestPools([{
        pool: tetuUsdc.address,
        swapper: swapper.address,
        tokenIn: tetu.address,
        tokenOut: usdc.address,
      }], false);

      await liquidator.addLargestPools([{
        pool: maticUsdc.address,
        swapper: swapper.address,
        tokenIn: matic.address,
        tokenOut: usdc.address,
      }], false);
      const amountToSwap = parseUnits('0.1');

      const amountUsdcMax = await UniswapUtils.getMaxAmountOut(signer, tetuUsdc.address, tetu.address, amountToSwap);
      const amountMaticMax = await UniswapUtils.getMaxAmountOut(signer, maticUsdc.address, usdc.address, amountUsdcMax);
      const predicted = await liquidator.getPriceWithImpact(tetu.address, matic.address, amountToSwap);
      console.log("amountUsdcMax", amountUsdcMax);
      console.log("amountMaticMax", amountMaticMax);
      console.log("predicted", predicted);

      await tetu.approve(liquidator.address, Misc.MAX_UINT);
      await liquidator.liquidate(tetu.address, matic.address, amountToSwap, 100_000);
      const balanceAfter = await matic.balanceOf(signer.address);
      const amountOut = balanceAfter.sub(balanceBefore);

      const priceImpact = (amountMaticMax.sub(amountOut)).mul(100_000).div(amountMaticMax);

      console.log("amountOut", amountOut);
      console.log("priceImpact", priceImpact);

      expect(priceImpact.toString()).eq(predicted.priceImpactOut.toString());
    });
  });
});


async function createPair(signer: SignerWithAddress, factory: UniswapV2Factory, token1: string, token2: string) {
  await factory.createPair(token1, token2);
  const pairAdr = await factory.getPair(token1, token2);
  const pair = UniswapV2Pair__factory.connect(pairAdr, signer);
  await IERC20__factory.connect(token1, signer).transfer(pairAdr, parseUnits('1', await IERC20Metadata__factory.connect(token1, signer).decimals()))
  await IERC20__factory.connect(token2, signer).transfer(pairAdr, parseUnits('2', await IERC20Metadata__factory.connect(token2, signer).decimals()))
  await pair.mint(signer.address);
  return pair;
}
