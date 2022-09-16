import {ethers} from "hardhat";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {expect} from "chai";
import {
  Controller,
  DystFactory,
  DystopiaSwapper,
  IERC20__factory,
  IERC20Metadata__factory,
  MockToken,
  UniswapV2Pair,
  UniswapV2Pair__factory
} from "../../typechain";
import {parseUnits} from "ethers/lib/utils";
import {TimeUtils} from "../TimeUtils";
import {DeployerUtils} from "../../scripts/utils/DeployerUtils";


describe("DystopiaSwapperTests", function () {
  let snapshotBefore: string;
  let snapshot: string;
  let signer: SignerWithAddress;
  let signer2: SignerWithAddress;
  let controller: Controller;
  let swapper: DystopiaSwapper;
  let factory: DystFactory;

  let usdc: MockToken;
  let tetu: MockToken;
  let matic: MockToken;

  let tetuUsdc: UniswapV2Pair;

  before(async function () {
    snapshotBefore = await TimeUtils.snapshot();
    [signer, signer2] = await ethers.getSigners();
    controller = await DeployerUtils.deployController(signer);

    swapper = await DeployerUtils.deployDystopiaSwapper(signer, controller.address);

    const uniData = await DeployerUtils.deployDystopia(signer);
    factory = uniData.factory;

    usdc = await DeployerUtils.deployMockToken(signer, 'USDC', 6);
    tetu = await DeployerUtils.deployMockToken(signer, 'TETU');
    matic = await DeployerUtils.deployMockToken(signer, 'WMATIC');

    tetuUsdc = await createPair(signer, factory, usdc.address, tetu.address, false);
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

  it("swap price impact revert", async () => {
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
    const tetuWmatic = await createPair(signer, factory, matic.address, tetu.address, true);
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
    expect(await swapper.getPrice(tetuUsdc.address, tetu.address, usdc.address, parseUnits('1'))).eq(parseUnits('0.499747', 6));
  });

  it("swap pair sync coverage", async () => {
    const _USD_PLUS_MATIC = '0x236eeC6359fb44CCe8f97E99387aa7F8cd5cdE1f';
    const _USD_PLUS_BSC  = '0xe80772Eaf6e2E18B651F160Bc9158b2A5caFCA65';
    await tetu.transfer(swapper.address, parseUnits('10000'));

    await expect(swapper.swap(
      tetuUsdc.address,
      tetu.address,
      _USD_PLUS_MATIC,
      signer.address,
      0
    )).reverted;

    await expect(swapper.swap(
      tetuUsdc.address,
      tetu.address,
      _USD_PLUS_BSC,
      signer.address,
      0
    )).reverted;
  });

});


async function createPair(signer: SignerWithAddress, factory: DystFactory, token1: string, token2: string, stable: boolean) {
  await factory.createPair(token1, token2, stable);
  const pairAdr = await factory.getPair(token1, token2, stable);
  const pair = UniswapV2Pair__factory.connect(pairAdr, signer);
  await IERC20__factory.connect(token1, signer).transfer(pairAdr, parseUnits('100000', await IERC20Metadata__factory.connect(token1, signer).decimals()))
  await IERC20__factory.connect(token2, signer).transfer(pairAdr, parseUnits('200000', await IERC20Metadata__factory.connect(token2, signer).decimals()))
  await pair.mint(signer.address);
  return pair;
}
