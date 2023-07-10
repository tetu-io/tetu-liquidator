import {ethers} from "hardhat";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {expect} from "chai";
import {
  Controller,
  IBVault__factory,
  BalancerLinearPoolSwapper,
  IBLinearPoolMinimal__factory, IERC20Metadata__factory,
} from "../../typechain";
import {parseUnits} from "ethers/lib/utils";
import {TimeUtils} from "../TimeUtils";
import {DeployerUtils} from "../../scripts/utils/DeployerUtils";
import {MaticAddresses} from "../../scripts/addresses/MaticAddresses";
import {Misc} from "../../scripts/utils/Misc";


describe("BalancerLinearPoolSwapperTests", function () {
  let snapshotBefore: string;
  let snapshot: string;
  let signer: SignerWithAddress;
  let signer2: SignerWithAddress;
  let controller: Controller;
  let swapper: BalancerLinearPoolSwapper;

  before(async function () {
    snapshotBefore = await TimeUtils.snapshot();
    [signer, signer2] = await ethers.getSigners();
    controller = await DeployerUtils.deployController(signer);

    swapper = await DeployerUtils.deployBalancerLinearPoolSwapper(signer, controller.address, MaticAddresses.BALANCER_VAULT);
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

  it.only("get price eq queryBatchSwap for USDC -> BB_T_USDC (main -> bpt)", async () => {
    const vault = IBVault__factory.connect(MaticAddresses.BALANCER_VAULT, signer)
    const pool = IBLinearPoolMinimal__factory.connect(MaticAddresses.BB_T_USDC, signer)
    const amount = parseUnits('1000000', 6);

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
        [MaticAddresses.USDC_TOKEN, MaticAddresses.BB_T_USDC],
        funds
    );

    const price = await swapper.getPrice(pool.address, MaticAddresses.USDC_TOKEN, MaticAddresses.BB_T_USDC, amount);
    console.log('delta', balDelta.abs()); // return value is negative delta for pool
    console.log('price', price);
    expect(price).eq(balDelta.abs());
    expect(price).gt(0)

    // swap
    const holderUsdc = await Misc.impersonate(MaticAddresses.HOLDER_USDC)
    const usdc = IERC20Metadata__factory.connect(MaticAddresses.USDC_TOKEN, holderUsdc)
    await usdc.transfer(swapper.address, amount)
    await swapper.swap(
      MaticAddresses.BB_T_USDC,
      MaticAddresses.USDC_TOKEN,
      MaticAddresses.BB_T_USDC,
      signer.address,
      100
    );
    const bbtusdc = IERC20Metadata__factory.connect(MaticAddresses.BB_T_USDC, holderUsdc)
    const balAfter = await bbtusdc.balanceOf(signer.address);
    console.log(balAfter)
    // not equal without division because getWrappedTokenRate is changing in each block
    expect(price.div(parseUnits('1'))).eq(balAfter.div(parseUnits('1')));
  });

  it("get price eq queryBatchSwap for BB_T_USDC -> USDC (bpt -> main)", async () => {
    const vault = IBVault__factory.connect(MaticAddresses.BALANCER_VAULT, signer)
    const pool = IBLinearPoolMinimal__factory.connect(MaticAddresses.BB_T_USDC, signer)
    const amount = parseUnits('100');

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
      [MaticAddresses.BB_T_USDC, MaticAddresses.USDC_TOKEN],
      funds
    );

    const price = await swapper.getPrice(pool.address, MaticAddresses.BB_T_USDC, MaticAddresses.USDC_TOKEN, amount);
    console.log('delta', balDelta.abs()); // return value is negative delta for pool
    console.log('price', price);
    expect(price).eq(balDelta.abs());
    expect(price).gt(0)
  });

  it("get price eq queryBatchSwap for USDC -> TUSDC (main -> wrapped)", async () => {
    const vault = IBVault__factory.connect(MaticAddresses.BALANCER_VAULT, signer)
    const pool = IBLinearPoolMinimal__factory.connect(MaticAddresses.BB_T_USDC, signer)
    const amount = parseUnits('1', 6);

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
      [MaticAddresses.USDC_TOKEN, MaticAddresses.TETU_TUSDC],
      funds
    );

    const price = await swapper.getPrice(pool.address, MaticAddresses.USDC_TOKEN, MaticAddresses.TETU_TUSDC, amount);
    console.log('delta', balDelta.abs()); // return value is negative delta for pool
    console.log('price', price);
    expect(price).eq(balDelta.abs());
    expect(price).gt(0)
  });

  it("get price eq queryBatchSwap for TUSDC -> USDC (wrapped -> main)", async () => {
    const vault = IBVault__factory.connect(MaticAddresses.BALANCER_VAULT, signer)
    const pool = IBLinearPoolMinimal__factory.connect(MaticAddresses.BB_T_USDC, signer)
    const amount = parseUnits('1', 6);

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
      [MaticAddresses.TETU_TUSDC, MaticAddresses.USDC_TOKEN],
      funds
    );

    const price = await swapper.getPrice(pool.address, MaticAddresses.TETU_TUSDC, MaticAddresses.USDC_TOKEN, amount);
    console.log('delta', balDelta.abs()); // return value is negative delta for pool
    console.log('price', price);
    expect(price).eq(balDelta.abs());
    expect(price).gt(0)
  });

  it("get price eq queryBatchSwap for TUSDC -> BB_T_USDC (wrapped -> bpt)", async () => {
    const vault = IBVault__factory.connect(MaticAddresses.BALANCER_VAULT, signer)
    const pool = IBLinearPoolMinimal__factory.connect(MaticAddresses.BB_T_USDC, signer)
    const amount = parseUnits('1000', 6);

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
      [MaticAddresses.TETU_TUSDC, MaticAddresses.BB_T_USDC],
      funds
    );

    const price = await swapper.getPrice(pool.address, MaticAddresses.TETU_TUSDC, MaticAddresses.BB_T_USDC, amount);
    console.log('delta', balDelta.abs()); // return value is negative delta for pool
    console.log('price', price);
    expect(price).eq(balDelta.abs());
    expect(price).gt(0)
  });

  it("get price eq queryBatchSwap for BB_T_USDC -> TUSDC (bpt -> wrapped)", async () => {
    const vault = IBVault__factory.connect(MaticAddresses.BALANCER_VAULT, signer)
    const pool = IBLinearPoolMinimal__factory.connect(MaticAddresses.BB_T_USDC, signer)
    const amount = parseUnits('100');

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
      [MaticAddresses.BB_T_USDC, MaticAddresses.TETU_TUSDC],
      funds
    );

    const price = await swapper.getPrice(pool.address, MaticAddresses.BB_T_USDC, MaticAddresses.TETU_TUSDC, amount);
    console.log('delta', balDelta.abs()); // return value is negative delta for pool
    console.log('price', price);
    expect(price).eq(balDelta.abs());
    expect(price).gt(0)
  });
});
