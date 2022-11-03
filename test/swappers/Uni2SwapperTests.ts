import {ethers} from "hardhat";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {expect} from "chai";
import {
  Controller,
  IERC20__factory,
  IERC20Metadata__factory, IUniswapV2Pair__factory,
  MockToken,
  Uni2Swapper,
  UniswapV2Factory,
  UniswapV2Pair,
  UniswapV2Pair__factory
} from "../../typechain";
import {parseUnits} from "ethers/lib/utils";
import {TimeUtils} from "../TimeUtils";
import {DeployerUtils} from "../../scripts/utils/DeployerUtils";
import {Misc} from "../../scripts/utils/Misc";
import {UniswapUtils} from "../UniswapUtils";


describe("Uni2SwapperTests", function () {
  let snapshotBefore: string;
  let snapshot: string;
  let signer: SignerWithAddress;
  let signer2: SignerWithAddress;
  let controller: Controller;
  let swapper: Uni2Swapper;
  let factory: UniswapV2Factory;

  let usdc: MockToken;
  let tetu: MockToken;
  let matic: MockToken;

  let tetuUsdc: UniswapV2Pair;

  before(async function () {
    snapshotBefore = await TimeUtils.snapshot();
    [signer, signer2] = await ethers.getSigners();
    controller = await DeployerUtils.deployController(signer);

    swapper = await DeployerUtils.deployUni2Swapper(signer, controller.address);

    const uniData = await DeployerUtils.deployUniswap(signer);
    factory = uniData.factory;

    usdc = await DeployerUtils.deployMockToken(signer, 'USDC', 6);
    tetu = await DeployerUtils.deployMockToken(signer, 'TETU');
    matic = await DeployerUtils.deployMockToken(signer, 'WMATIC');

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

  it("swap with dec 18 to dec 6 test", async () => {
    await swapper.setFee(factory.address, 300);
    const bal = await usdc.balanceOf(signer.address);
    await tetu.transfer(swapper.address, parseUnits('10000'))
    await swapper.swap(
      tetuUsdc.address,
      tetu.address,
      usdc.address,
      signer.address,
      6_000
    );
    const balAfter = await usdc.balanceOf(signer.address);
    expect(balAfter.sub(bal)).above(parseUnits('4700', 6));
  });

  it("swap with dec 6 to dec 18 test", async () => {
    await swapper.setFee(factory.address, 300);
    const bal = await tetu.balanceOf(signer.address);
    await usdc.transfer(swapper.address, parseUnits('10000', 6))
    await swapper.swap(
      tetuUsdc.address,
      usdc.address,
      tetu.address,
      signer.address,
      10_000
    );
    const balAfter = await tetu.balanceOf(signer.address);
    expect(balAfter.sub(bal)).above(parseUnits('4700'));
  });

  it("set fee from non gov revert", async () => {
    await expect(swapper.connect(signer2).setFee(Misc.ZERO_ADDRESS, 0)).revertedWith('DENIED')
  });

  it("swap without fee revert", async () => {
    await expect(swapper.swap(
      tetuUsdc.address,
      tetu.address,
      usdc.address,
      signer.address,
      6_000
    )).revertedWith('ZERO_FEE');
  });

  it("swap price impact revert", async () => {
    await swapper.setFee(factory.address, 300);
    await tetu.transfer(swapper.address, parseUnits('10000'))
    await expect(swapper.swap(
      tetuUsdc.address,
      tetu.address,
      usdc.address,
      signer.address,
      0
    )).revertedWith('!PRICE');
  });

  it("swap tokens with 18 dec test", async () => {
    const tetuWmatic = await createPair(signer, factory, matic.address, tetu.address);
    await swapper.setFee(factory.address, 300);
    const bal = await matic.balanceOf(signer.address);
    await tetu.transfer(swapper.address, parseUnits('10000'))
    await swapper.swap(
      tetuWmatic.address,
      tetu.address,
      matic.address,
      signer.address,
      6_000
    );
    const balAfter = await matic.balanceOf(signer.address);
    expect(balAfter.sub(bal)).above(parseUnits('4700', 6));
  });

  it("get price test", async () => {
    expect(await swapper.getPrice(tetuUsdc.address, tetu.address, usdc.address, parseUnits('1'))).eq(parseUnits('0.499997', 6));
    expect((await swapper.getPriceWithImpact(tetuUsdc.address, tetu.address, usdc.address, parseUnits('1'))).amountOut).eq(parseUnits('0.499997', 6));
  });

  it("get price-with-impact test", async () => {
    const amountToSwapHuge = parseUnits('90000');
    await swapper.setFee(factory.address, 300);

    const amountOutMax = await UniswapUtils.getMaxAmountOut(signer, tetuUsdc.address, tetu.address, amountToSwapHuge);
    const balanceUsdcSignerBefore = await usdc.balanceOf(signer.address);
    const {amountOut, priceImpactOut} = await swapper.getPriceWithImpact(tetuUsdc.address, tetu.address, usdc.address, amountToSwapHuge);
    await tetu.transfer(swapper.address, amountToSwapHuge);

    await swapper.swap(tetuUsdc.address, tetu.address, usdc.address, signer.address, 100_000);
    const amountOutAfterSwap = (await usdc.balanceOf(signer.address)).sub(balanceUsdcSignerBefore);

    const ret = [
      amountOut.toString(),
      priceImpactOut.toString()
    ].join();
    const expected = [
      amountOutAfterSwap.toString(),
      (amountOutMax.sub(amountOutAfterSwap)).mul(100_000).div(amountOutMax).toString()
    ].join();

    expect(ret).eq(expected);
  });
});


async function createPair(signer: SignerWithAddress, factory: UniswapV2Factory, token1: string, token2: string) {
  await factory.createPair(token1, token2);
  const pairAdr = await factory.getPair(token1, token2);
  const pair = UniswapV2Pair__factory.connect(pairAdr, signer);
  await IERC20__factory.connect(token1, signer).transfer(pairAdr, parseUnits('100000', await IERC20Metadata__factory.connect(token1, signer).decimals()))
  await IERC20__factory.connect(token2, signer).transfer(pairAdr, parseUnits('200000', await IERC20Metadata__factory.connect(token2, signer).decimals()))
  await pair.mint(signer.address);
  return pair;
}
