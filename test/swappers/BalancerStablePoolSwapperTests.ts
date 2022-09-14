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
import {BigNumber} from "ethers";


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
  let vtoken: MockToken;

  const one6decimals = parseUnits('1', 6);

  let stablePool: StablePool;

  before(async function () {
    snapshotBefore = await TimeUtils.snapshot();
    [signer, signer2] = await ethers.getSigners();
    controller = await DeployerUtils.deployController(signer);

    const balancerCore = await DeployerUtils.deployBalancer(signer);
    vault = balancerCore.vault;

    swapper = await DeployerUtils.deployBalancerStablePoolSwapper(signer, controller.address, vault.address);

    usdc = await DeployerUtils.deployMockToken(signer, 'USDC', 6);
    usdt = await DeployerUtils.deployMockToken(signer, 'USDT', 6);
    mai = await DeployerUtils.deployMockToken(signer, 'miMATIC');
    dai = await DeployerUtils.deployMockToken(signer, 'DAI');

    vtoken = await DeployerUtils.deployMockToken(signer, 'VTOKEN');

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
    await usdt.transfer(swapper.address, one6decimals)
    await swapper.swap(
      stablePool.address,
      usdt.address,
      usdc.address,
      signer.address,
      6_000
    );
    const balAfter = await usdc.balanceOf(signer.address);
    expect(balAfter.sub(balance)).above(parseUnits('0.99', 6));
  });

  it("swap test reverse", async () => {
    const balance = await usdt.balanceOf(signer.address);
    await usdc.transfer(swapper.address, one6decimals)
    await swapper.swap(
      stablePool.address,
      usdc.address,
      usdt.address,
      signer.address,
      10_000
    );
    const balAfter = await usdt.balanceOf(signer.address);
    expect(balAfter.sub(balance)).above(parseUnits('0.99', 6));
  });

  it("swap price impact revert", async () => {
    await usdc.transfer(swapper.address, one6decimals.mul(1000))
    await expect(swapper.swap(
      stablePool.address,
      usdc.address,
      usdt.address,
      signer.address,
      0
    )).revertedWith('!PRICE');
  });

  it("swap price tokenIn revert", async () => {
    await expect(
      swapper.getPrice(stablePool.address, vtoken.address, usdt.address, one6decimals)
    ).revertedWith('Wrong tokenIn');
  });

  it("swap price tokenOut revert", async () => {
    await expect(
      swapper.getPrice(stablePool.address, usdc.address, vtoken.address, one6decimals)
    ).revertedWith('Wrong tokenOut');
  });

  it("get price test", async () => {
    expect(
      await swapper.getPrice(stablePool.address, usdc.address, dai.address, one6decimals)
    ).eq(parseUnits('0.99'));
  });

  it("get price test reverse", async () => {
    expect(
      await swapper.getPrice(stablePool.address, dai.address, usdc.address, parseUnits('1'))
    ).eq(parseUnits('0.99', 6));
  });

  it("get price eq queryBatchSwap", async () => {
    const amount = one6decimals.mul(100);

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
