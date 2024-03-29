import {ethers} from "hardhat";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {expect} from "chai";
import {
  BalancerWeightedPoolSwapper,
  Controller,
  MockToken,
  Vault,
  WeightedPool,
} from "../../typechain";
import {formatUnits, parseUnits} from "ethers/lib/utils";
import {TimeUtils} from "../TimeUtils";
import {DeployerUtils} from "../../scripts/utils/DeployerUtils";


describe("BalancerWeightedPoolSwapperTests", function () {
  let snapshotBefore: string;
  let snapshot: string;
  let signer: SignerWithAddress;
  let signer2: SignerWithAddress;
  let controller: Controller;
  let swapper: BalancerWeightedPoolSwapper;
  let vault: Vault;

  let usdc: MockToken;
  let bal: MockToken;
  let matic: MockToken;

  const usdDecimals = 6;
  const oneUSD = parseUnits('1', usdDecimals);

  let weightedPool: WeightedPool;

  before(async function () {
    snapshotBefore = await TimeUtils.snapshot();
    [signer, signer2] = await ethers.getSigners();
    controller = await DeployerUtils.deployController(signer);

    const balancerCore = await DeployerUtils.deployBalancer(signer);
    vault = balancerCore.vault;

    swapper = await DeployerUtils.deployBalancerWeightedPoolSwapper(signer, controller.address, vault.address);

    usdc = await DeployerUtils.deployMockToken(signer, 'USDC', usdDecimals);
    bal = await DeployerUtils.deployMockToken(signer, 'BAL', 18, '1000000000');

    weightedPool = await DeployerUtils.deployAndInitBalancerWeightedPool(
      signer,
      vault.address,
      [bal, usdc,],
      [parseUnits('0.8'), parseUnits('0.2')],
      // Initially 1USDC = 100BAL
      [parseUnits('80000000'), parseUnits('200000', usdDecimals)]
    );

    matic = await DeployerUtils.deployMockToken(signer, 'WMATIC');
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

  it("swap test", async () => {
    const balance = await usdc.balanceOf(signer.address);
    await bal.transfer(swapper.address, parseUnits('100'))
    await swapper.swap(
      weightedPool.address,
      bal.address,
      usdc.address,
      signer.address,
      6_000
    );
    const balAfter = await usdc.balanceOf(signer.address);
    expect(balAfter.sub(balance)).above(parseUnits('0.99', usdDecimals));
  });

  it("swap test reverse", async () => {
    const balance = await bal.balanceOf(signer.address);
    await usdc.transfer(swapper.address, oneUSD)
    await swapper.swap(
      weightedPool.address,
      usdc.address,
      bal.address,
      signer.address,
      10_000
    );
    const balAfter = await bal.balanceOf(signer.address);
    expect(balAfter.sub(balance)).above(parseUnits('99'));
  });

  it("swap price impact revert", async () => {
    await usdc.transfer(swapper.address, oneUSD.mul('10000'));
    await expect(
      swapper.swap(
        weightedPool.address,
        usdc.address,
        bal.address,
        signer.address,
        0
      )
    ).revertedWith('!PRICE');
  });

  it("init with zero address should revert", async () => {
    expect(
      DeployerUtils.deployBalancerWeightedPoolSwapper(signer, controller.address, ethers.constants.AddressZero)
    ).revertedWith('Zero balancerVault');
  });

  it("init with non zero address should not revert", async () => {
    expect(
      await DeployerUtils.deployBalancerWeightedPoolSwapper(signer, controller.address, vault.address)
    ).is.not.eq(ethers.constants.AddressZero);
  });

  it("swap price tokenIn revert", async () => {
    await expect(
      swapper.getPrice(weightedPool.address, matic.address, bal.address, parseUnits('1'))
    ).revertedWith('Wrong tokenIn');
  });

  it("swap price tokenOut revert", async () => {
    await expect(
      swapper.getPrice(weightedPool.address, usdc.address, matic.address, oneUSD)
    ).revertedWith('Wrong tokenOut');
  });

  it("get price test", async () => {
    expect(
      await swapper.getPrice(weightedPool.address, usdc.address, bal.address, oneUSD)
    ).eq(parseUnits('99.7496882616'));
    expect(
      formatUnits(await swapper.getPrice(weightedPool.address, bal.address, usdc.address, parseUnits('100')), 6)
    ).eq('0.997496');
  });

  it("get price test reverse", async () => {
    expect(
      await swapper.getPrice(weightedPool.address, bal.address, usdc.address, parseUnits('100'))
    ).eq(parseUnits('0.997496', usdDecimals));
  });

  it("get price eq queryBatchSwap", async () => {
    const amount = parseUnits('100', usdDecimals);

    const poolId = await weightedPool.getPoolId();

    const batchSwapStep = {
      poolId,
      assetInIndex: '0',
      assetOutIndex: '1',
      amount,
      userData: '0x',
    };

    const funds = {
      sender: signer.address,
      fromInternalBalance: false,
      recipient: signer.address,
      toInternalBalance: false,
    }

    const SWAP_KIND_GIVEN_IN = '0';

    const [, balDelta] = await vault.callStatic.queryBatchSwap(
      SWAP_KIND_GIVEN_IN,
      [batchSwapStep],
      [usdc.address, bal.address],
      funds
    );

    const price = await swapper.getPrice(weightedPool.address, usdc.address, bal.address, amount);
    console.log('delta', balDelta.abs()); // return value is negative delta for pool
    console.log('price', price);
    expect(price).eq(balDelta.abs());
  });

});
