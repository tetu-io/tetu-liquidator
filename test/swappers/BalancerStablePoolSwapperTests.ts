import {ethers} from "hardhat";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {expect} from "chai";
import {
  Controller,
  BalancerStablePoolSwapper,
  MockToken,
  StablePool,
  Vault,
} from "../../typechain";
import {parseUnits} from "ethers/lib/utils";
import {TimeUtils} from "../TimeUtils";
import {DeployerUtils} from "../../scripts/utils/DeployerUtils";


describe("BalancerStablePoolSwapperTests", function () {
  let snapshotBefore: string;
  let snapshot: string;
  let signer: SignerWithAddress;
  let signer2: SignerWithAddress;
  let controller: Controller;
  let swapper: BalancerStablePoolSwapper;
  let vault: Vault;

  let usdc: MockToken;
  let usdt: MockToken;
  let mai: MockToken;
  let dai: MockToken;
  let wrongToken: MockToken;

  const usdDecimals = 6;
  const oneUSD = parseUnits('1', usdDecimals);

  let stablePool: StablePool;

  before(async function () {
    snapshotBefore = await TimeUtils.snapshot();
    [signer, signer2] = await ethers.getSigners();
    controller = await DeployerUtils.deployController(signer);

    const balancerCore = await DeployerUtils.deployBalancer(signer);
    vault = balancerCore.vault;

    swapper = await DeployerUtils.deployBalancerStablePoolSwapper(signer, controller.address, vault.address);

    usdc = await DeployerUtils.deployMockToken(signer, 'USDC', usdDecimals);
    usdt = await DeployerUtils.deployMockToken(signer, 'USDT', usdDecimals);
    mai = await DeployerUtils.deployMockToken(signer, 'miMATIC');
    dai = await DeployerUtils.deployMockToken(signer, 'DAI');

    // token for testing wrong tokens
    wrongToken = await DeployerUtils.deployMockToken(signer, 'WTOKEN');

    stablePool = await DeployerUtils.deployAndInitBalancerStablePool(
      signer,
      vault.address,
      [usdc, usdt, mai, dai],
    );

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
    await usdt.transfer(swapper.address, oneUSD)
    await swapper.swap(
      stablePool.address,
      usdt.address,
      usdc.address,
      signer.address,
      5_000
    );
    const balAfter = await usdc.balanceOf(signer.address);
    expect(balAfter.sub(balance)).above(parseUnits('0.99', usdDecimals));
  });

  it("swap test reverse", async () => {
    const balance = await usdt.balanceOf(signer.address);
    await usdc.transfer(swapper.address, oneUSD)
    await swapper.swap(
      stablePool.address,
      usdc.address,
      usdt.address,
      signer.address,
      10_000
    );
    const balAfter = await usdt.balanceOf(signer.address);
    expect(balAfter.sub(balance)).above(parseUnits('0.99', usdDecimals));
  });

  it("swap price impact revert", async () => {
    await usdc.transfer(swapper.address, oneUSD.mul(1000))
    await expect(
      swapper.swap(
        stablePool.address,
        usdc.address,
        usdt.address,
        signer.address,
        0
      )
    ).revertedWith('!PRICE');
  });

  it("init with zero address should revert", async () => {
    expect(
      DeployerUtils.deployBalancerStablePoolSwapper(signer, controller.address, ethers.constants.AddressZero)
    ).revertedWith('Zero balancerVault');
  });

  it("init with non zero address should not revert", async () => {
    expect(
      await DeployerUtils.deployBalancerStablePoolSwapper(signer, controller.address, vault.address)
    ).is.not.eq(ethers.constants.AddressZero);
  });

  it("swap price tokenIn revert", async () => {
    await expect(
      swapper.getPrice(stablePool.address, wrongToken.address, usdt.address, oneUSD)
    ).revertedWith('Wrong tokenIn');
  });

  it("swap price tokenOut revert", async () => {
    await expect(
      swapper.getPrice(stablePool.address, usdc.address, wrongToken.address, oneUSD)
    ).revertedWith('Wrong tokenOut');
  });

  it("get price test", async () => {
    expect(
      await swapper.getPrice(stablePool.address, usdc.address, dai.address, oneUSD)
    ).eq(parseUnits('0.999599950288551326'));
  });

  it("get price test reverse", async () => {
    expect(
      await swapper.getPrice(stablePool.address, dai.address, usdc.address, parseUnits('1'))
    ).eq(parseUnits('0.999599', usdDecimals));
  });

  it("get price eq queryBatchSwap", async () => {
    const amount = oneUSD.mul(100);

    const poolId = await stablePool.getPoolId();

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
      [usdc.address, usdt.address],
      funds
    );

    const price = await swapper.getPrice(stablePool.address, usdc.address, usdt.address, amount);
    console.log('delta', balDelta.abs()); // return value is negative delta for pool
    console.log('price', price);
    expect(price).eq(balDelta.abs());
  });

});
