import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {IERC20__factory, KyberSwapper} from "../../typechain";
import {TimeUtils} from "../TimeUtils";
import hre, {ethers} from "hardhat";
import {DeployerUtils} from "../../scripts/utils/DeployerUtils";
import {formatUnits, parseUnits} from "ethers/lib/utils";
import {MaticAddresses} from "../../scripts/addresses/MaticAddresses";
import {Misc} from "../../scripts/utils/Misc";
import {expect} from "chai";

describe("KyberSwapperTests", function () {
  let snapshotBefore: string;
  let snapshot: string;
  let signer: SignerWithAddress;

  let swapper: KyberSwapper;

  before(async function () {
    snapshotBefore = await TimeUtils.snapshot();
    [signer] = await ethers.getSigners();

    const controller = await DeployerUtils.deployController(signer);
    swapper = await DeployerUtils.deployKyberSwapper(signer, controller.address);
  })

  after(async function () {
    await TimeUtils.rollback(snapshotBefore);
  });

  beforeEach(async function () {
    snapshot = await TimeUtils.snapshot();
  });

  afterEach(async function () {
    await TimeUtils.rollback(snapshot);
  });

  it("getPrice and swap usdc to usdt", async () => {
    if (hre.network.config.chainId !== 137) {
      return;
    }

    const price = +formatUnits(await swapper.getPrice(
      MaticAddresses.KYBER_USDC_USDT,
      MaticAddresses.USDC_TOKEN,
      MaticAddresses.USDT_TOKEN,
      parseUnits('1', 6)
    ), 6)
    expect(price).approximately(1, 0.01);

    await IERC20__factory.connect(MaticAddresses.USDC_TOKEN, await Misc.impersonate(MaticAddresses.HOLDER_USDC)).transfer(swapper.address, parseUnits('1000', 6))
    await swapper.swap(
      MaticAddresses.KYBER_USDC_USDT,
      MaticAddresses.USDC_TOKEN,
      MaticAddresses.USDT_TOKEN,
      signer.address,
      1_000
    );

    const balAfter = await IERC20__factory.connect(MaticAddresses.USDT_TOKEN, signer).balanceOf(signer.address)
    expect(+formatUnits(balAfter, 6)).approximately(1000, 1)
  })

  it("getPrice and swap wbtc to weth", async () => {
    if (hre.network.config.chainId !== 137) {
      return;
    }

    const price = +formatUnits(await swapper.getPrice(
        MaticAddresses.KYBER_WBTC_WETH,
        MaticAddresses.WBTC_TOKEN,
        MaticAddresses.WETH_TOKEN,
        parseUnits('1', 8)
    ), 18)

    console.log(`WBTC price = ${price} WETH`)

    expect(price).approximately(16, 5);

    await IERC20__factory.connect(MaticAddresses.WBTC_TOKEN, await Misc.impersonate(MaticAddresses.HOLDER_WBTC)).transfer(swapper.address, parseUnits('1', 8))
    await swapper.swap(
        MaticAddresses.KYBER_WBTC_WETH,
        MaticAddresses.WBTC_TOKEN,
        MaticAddresses.WETH_TOKEN,
        signer.address,
        1_000
    );

    const balAfter = await IERC20__factory.connect(MaticAddresses.WETH_TOKEN, signer).balanceOf(signer.address)
    expect(+formatUnits(balAfter, 18)).approximately(16, 5)
  })
})