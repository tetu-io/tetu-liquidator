import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {IERC20__factory, PearlSwapper} from "../../typechain";
import {TimeUtils} from "../TimeUtils";
import hre, {ethers} from "hardhat";
import {DeployerUtils} from "../../scripts/utils/DeployerUtils";
import {formatUnits, parseUnits} from "ethers/lib/utils";
import {MaticAddresses} from "../../scripts/addresses/MaticAddresses";
import {Misc} from "../../scripts/utils/Misc";
import {expect} from "chai";

describe("PearlSwapperTests", function () {
  let snapshotBefore: string;
  let snapshot: string;
  let signer: SignerWithAddress;

  let swapper: PearlSwapper;

  before(async function () {
    snapshotBefore = await TimeUtils.snapshot();
    [signer] = await ethers.getSigners();

    const controller = await DeployerUtils.deployController(signer);
    swapper = await DeployerUtils.deployPearlSwapper(signer, controller.address);
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

  it("getPrice and swap cvr to pearl", async () => {
    if (hre.network.config.chainId !== 137) {
      return;
    }

    const price = +formatUnits(await swapper.getPrice(
      MaticAddresses.PEARL_CVR_PEARL,
      MaticAddresses.CAVIAR_TOKEN,
      MaticAddresses.PEARL_TOKEN,
      parseUnits('1', 18)
    ), 18)
    expect(price).approximately(0.97, 0.01);

    await IERC20__factory.connect(MaticAddresses.CAVIAR_TOKEN, await Misc.impersonate(MaticAddresses.HOLDER_CAVIAR)).transfer(swapper.address, parseUnits('1000', 18))
    await swapper.swap(
      MaticAddresses.PEARL_CVR_PEARL,
      MaticAddresses.CAVIAR_TOKEN,
      MaticAddresses.PEARL_TOKEN,
      signer.address,
      1_000
    );

    const balAfter = await IERC20__factory.connect(MaticAddresses.PEARL_TOKEN, signer).balanceOf(signer.address)
    expect(+formatUnits(balAfter, 18)).approximately(970, 1)
  })
})