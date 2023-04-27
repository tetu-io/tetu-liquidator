import hre, {ethers} from "hardhat";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {expect} from "chai";
import {
  Controller,
  BalancerComposableStablePoolSwapper,
  IERC20Metadata__factory, IBVault__factory, IBComposableStablePoolMinimal__factory,
} from "../../typechain";
import {parseUnits} from "ethers/lib/utils";
import {TimeUtils} from "../TimeUtils";
import {DeployerUtils} from "../../scripts/utils/DeployerUtils";
import {MaticAddresses} from "../../scripts/addresses/MaticAddresses";
import {Misc} from "../../scripts/utils/Misc";


describe("BalancerComposableStablePoolSwapperTests", function () {
  let snapshotBefore: string;
  let snapshot: string;
  let signer: SignerWithAddress;
  let signer2: SignerWithAddress;
  let controller: Controller;
  let swapper: BalancerComposableStablePoolSwapper;

  before(async function () {
    snapshotBefore = await TimeUtils.snapshot();
    [signer, signer2] = await ethers.getSigners();
    controller = await DeployerUtils.deployController(signer);

    swapper = await DeployerUtils.deployBalancerComposableStablePoolSwapper(signer, controller.address, MaticAddresses.BALANCER_VAULT);
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
    if(hre.network.config.chainId !== 137) {
      return;
    }

    const holderWeth = await Misc.impersonate('0xfa0b641678f5115ad8a8de5752016bd1359681b9')
    const weth = IERC20Metadata__factory.connect(MaticAddresses.WETH_TOKEN, holderWeth)
    const wsteth = IERC20Metadata__factory.connect(MaticAddresses.wstETH_TOKEN, signer)
    await weth.transfer(swapper.address, parseUnits('10'))

    await swapper.swap(
      MaticAddresses.BALANCER_COMPOSABLE_STABLE_POOL_wstETH_WETH,
      MaticAddresses.WETH_TOKEN,
      MaticAddresses.wstETH_TOKEN,
      signer.address,
      5_000
    );
    const balAfter = await wsteth.balanceOf(signer.address);
    expect(balAfter).below(parseUnits('10'));
    expect(balAfter).above(parseUnits('5'));
  });

  it("swap price impact revert", async () => {
    if(hre.network.config.chainId !== 137) {
      return;
    }

    const holderWeth = await Misc.impersonate('0xfa0b641678f5115ad8a8de5752016bd1359681b9')
    const weth = IERC20Metadata__factory.connect(MaticAddresses.WETH_TOKEN, holderWeth)
    await weth.transfer(swapper.address, parseUnits('10'))
    await expect(swapper.swap(
        MaticAddresses.BALANCER_COMPOSABLE_STABLE_POOL_wstETH_WETH,
        MaticAddresses.WETH_TOKEN,
        MaticAddresses.wstETH_TOKEN,
        signer.address,
        0
    )).revertedWith('!PRICE')
  });

  it("init with zero address should revert", async () => {
    expect(
      DeployerUtils.deployBalancerStablePoolSwapper(signer, controller.address, ethers.constants.AddressZero)
    ).revertedWith('Zero balancerVault');
  });

  it("init with non zero address should not revert", async () => {
    expect(
      await DeployerUtils.deployBalancerStablePoolSwapper(signer, controller.address, MaticAddresses.BALANCER_VAULT)
    ).is.not.eq(ethers.constants.AddressZero);
  });

  it("swap price tokenIn revert", async () => {
    await expect(
      swapper.getPrice(MaticAddresses.BALANCER_COMPOSABLE_STABLE_POOL_wstETH_WETH, MaticAddresses.USDT_TOKEN, MaticAddresses.WETH_TOKEN, parseUnits('1', 6))
    ).revertedWith('Wrong tokenIn');
  });

  it("swap price tokenOut revert", async () => {
    await expect(
        swapper.getPrice(MaticAddresses.BALANCER_COMPOSABLE_STABLE_POOL_wstETH_WETH, MaticAddresses.WETH_TOKEN, MaticAddresses.USDC_TOKEN, parseUnits('1'))
    ).revertedWith('Wrong tokenOut');
  });

  it("get price test", async () => {
    const price = await swapper.getPrice(MaticAddresses.BALANCER_COMPOSABLE_STABLE_POOL_wstETH_WETH, MaticAddresses.WETH_TOKEN, MaticAddresses.wstETH_TOKEN, parseUnits('1'))
    expect(price).below(parseUnits('1'))
    expect(price).above(parseUnits('0.5'))

    const price2 = await swapper.getPrice(MaticAddresses.BB_T_USD, MaticAddresses.BB_T_USDT, MaticAddresses.BB_T_USDC, parseUnits('1'))
    expect(price2).below(parseUnits('1.1'))
    expect(price2).above(parseUnits('0.9'))
  });

  it("get price test reverse", async () => {
    const price = await swapper.getPrice(MaticAddresses.BALANCER_COMPOSABLE_STABLE_POOL_wstETH_WETH, MaticAddresses.wstETH_TOKEN, MaticAddresses.WETH_TOKEN, parseUnits('1'))
    expect(price).below(parseUnits('1.5'))
    expect(price).above(parseUnits('1'))
  });

  it("get price eq queryBatchSwap", async () => {
    const vault = IBVault__factory.connect(MaticAddresses.BALANCER_VAULT, signer)
    const pool = IBComposableStablePoolMinimal__factory.connect(MaticAddresses.BALANCER_COMPOSABLE_STABLE_POOL_wstETH_WETH, signer)
    const amount = parseUnits('1');

    const poolId = await pool.getPoolId();

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
        [MaticAddresses.wstETH_TOKEN, MaticAddresses.WETH_TOKEN],
        funds
    );

    const price = await swapper.getPrice(pool.address, MaticAddresses.wstETH_TOKEN, MaticAddresses.WETH_TOKEN, amount);
    console.log('delta', balDelta.abs()); // return value is negative delta for pool
    console.log('price', price);
    expect(price).gte(balDelta.abs().sub(1));
    expect(price).lte(balDelta.abs().add(1));
  });





});
