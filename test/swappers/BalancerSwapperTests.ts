import {ethers} from "hardhat";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {expect} from "chai";
import {
  Controller,
  BalancerSwapper,
  MockToken,
  WeightedPool,
  Vault,
} from "../../typechain";
import {parseEther, parseUnits} from "ethers/lib/utils";
import {TimeUtils} from "../TimeUtils";
import {DeployerUtils} from "../../scripts/utils/DeployerUtils";


describe("BalancerSwapperTests", function () {
  let snapshotBefore: string;
  let snapshot: string;
  let signer: SignerWithAddress;
  let signer2: SignerWithAddress;
  let controller: Controller;
  let swapper: BalancerSwapper;
  let vault: Vault;

  let weth: MockToken;
  let bal: MockToken;

  let weightedPool: WeightedPool;

  before(async function () {
    snapshotBefore = await TimeUtils.snapshot();
    [signer, signer2] = await ethers.getSigners();
    controller = await DeployerUtils.deployController(signer);

    const balancerCore = await DeployerUtils.deployBalancer(signer);
    vault = balancerCore.vault;

    swapper = await DeployerUtils.deployBalancerSwapper(signer, controller.address, vault.address);

    weth = await DeployerUtils.deployMockToken(signer, 'WETH');
    bal = await DeployerUtils.deployMockToken(signer, 'BAL', 18, '1000000000');

    weightedPool = await DeployerUtils.deployAndInitBalancerWeightedPool(
      signer,
      vault.address,
      [weth, bal],
      [parseEther('0.2'), parseEther('0.8')],
      // Initially 1WETH = 100BAL
      [parseEther('200000'), parseEther('80000000')]
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
    const balance = await weth.balanceOf(signer.address);
    await bal.transfer(swapper.address, parseUnits('100'))
    await swapper.swap(
      weightedPool.address,
      bal.address,
      weth.address,
      signer.address,
      6_000
    );
    const balAfter = await weth.balanceOf(signer.address);
    expect(balAfter.sub(balance)).above(parseUnits('0.99'));
  });

  it("swap test reverse", async () => {
    const balance = await bal.balanceOf(signer.address);
    await weth.transfer(swapper.address, parseUnits('1'))
    await swapper.swap(
      weightedPool.address,
      weth.address,
      bal.address,
      signer.address,
      10_000
    );
    const balAfter = await bal.balanceOf(signer.address);
    expect(balAfter.sub(balance)).above(parseUnits('99'));
  });

  it("swap price impact revert", async () => {
    await weth.transfer(swapper.address, parseUnits('10000'))
    await expect(swapper.swap(
      weightedPool.address,
      weth.address,
      bal.address,
      signer.address,
      0
    )).revertedWith('!PRICE');
  });

  it("get price test", async () => {
    expect(
      await swapper.getPrice(weightedPool.address, weth.address, bal.address, parseUnits('1'))
    ).eq(parseEther('99.7496882616'));
  });

  it("get price test reverse", async () => {
    expect(
      await swapper.getPrice(weightedPool.address, bal.address, weth.address, parseUnits('100'))
    ).eq(parseEther('0.9974968886124'));
  });

  it("get price eq queryBatchSwap", async () => {
    const amount = parseUnits('100');

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
      [weth.address, bal.address],
      funds
    );

    const price = await swapper.getPrice(weightedPool.address, weth.address, bal.address, amount);
    console.log('delta', balDelta.abs()); // return value is negative delta for pool
    console.log('price', price);
    expect(price).eq(balDelta.abs());
  });

});
