import {ethers} from "hardhat";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {expect} from "chai";
import {
  Controller,
  DystFactory,
  BalancerSwapper,
  IERC20__factory,
  IERC20Metadata__factory,
  MockToken,
  UniswapV2Pair,
  UniswapV2Pair__factory,
  Authorizer,
  Authorizer__factory,
  Vault,
  Vault__factory, WeightedPool,
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
  let balancerCore;

  let weth: MockToken;
  let bal: MockToken;
  let matic: MockToken;

  let weightedPool: WeightedPool;

  before(async function () {
    snapshotBefore = await TimeUtils.snapshot();
    [signer, signer2] = await ethers.getSigners();
    controller = await DeployerUtils.deployController(signer);

    balancerCore = await DeployerUtils.deployBalancer(signer);
    swapper = await DeployerUtils.deployBalancerSwapper(signer, controller.address, balancerCore.vault.address);


    weth = await DeployerUtils.deployMockToken(signer, 'WETH');
    bal = await DeployerUtils.deployMockToken(signer, 'BAL');
    matic = await DeployerUtils.deployMockToken(signer, 'WMATIC');

    weightedPool = await DeployerUtils.deployBalancerWeightedPool(
      signer,
      balancerCore.vault.address,
      [weth.address, bal.address],
      [parseEther('0.2'), parseEther('0.8')]
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
    await bal.transfer(swapper.address, parseUnits('10000'))
    await swapper.swap(
      weightedPool.address,
      bal.address,
      weth.address,
      signer.address,
      6_000
    );
    const balAfter = await weth.balanceOf(signer.address);
    expect(balAfter.sub(balance)).above(parseUnits('4700', 6));
  });

  it("swap test reverse", async () => {
    const balance = await bal.balanceOf(signer.address);
    await weth.transfer(swapper.address, parseUnits('10000', 6))
    await swapper.swap(
      weightedPool.address,
      weth.address,
      bal.address,
      signer.address,
      10_000
    );
    const balAfter = await bal.balanceOf(signer.address);
    expect(balAfter.sub(balance)).above(parseUnits('4700'));
  });

  it("swap price impact revert", async () => {
    await bal.transfer(swapper.address, parseUnits('10000'))
    await expect(swapper.swap(
      weightedPool.address,
      bal.address,
      weth.address,
      signer.address,
      0
    )).revertedWith('!PRICE');
  });

  it("get price test", async () => {
    expect(await swapper.getPrice(weightedPool.address, bal.address, weth.address, parseUnits('1'))).eq(parseUnits('0.499747', 6));
  });

});
