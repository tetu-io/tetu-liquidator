import {ethers} from "hardhat";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {expect} from "chai";
import { BigNumber } from "ethers";
import {
  Controller,
  CurveSwapper256,
  ICurveLpToken__factory, IERC20__factory,
  MockToken,
} from "../../typechain";
import {formatUnits, parseUnits} from "ethers/lib/utils";
import {TimeUtils} from "../TimeUtils";
import {DeployerUtils} from "../../scripts/utils/DeployerUtils";
import {Misc} from "../../scripts/utils/Misc";
import {BaseAddresses} from "../../scripts/addresses/BaseAddresses";

describe("CurveSwapper256BaseTests", function () {
  let snapshotBefore: string;
  let snapshot: string;
  let signer: SignerWithAddress;
  let controller: Controller;
  let swapper: CurveSwapper256;


  before(async function () {
    if(!Misc.isNetwork(8453)) {
      return;
    }
    snapshotBefore = await TimeUtils.snapshot();
    [signer] = await ethers.getSigners();
    controller = await DeployerUtils.deployController(signer);

    swapper = await DeployerUtils.deployCurveSwapper256(signer, controller.address);
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

  it("get price", async () => {
    if(!Misc.isNetwork(8453)) {
      return;
    }
    console.log('get price')
    await swapper.getPrice(BaseAddresses.CURVE_CRV_crvUSD_POOL, BaseAddresses.CRV_TOKEN, BaseAddresses.crvUSD_TOKEN, parseUnits('1'))
  });

});
