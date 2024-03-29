import {ethers} from "hardhat";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {expect} from "chai";
import {DeployerUtils} from "../../scripts/utils/DeployerUtils";
import {ControllableTest, Controller} from "../../typechain";
import {TimeUtils} from "../TimeUtils";
import {Misc} from "../../scripts/utils/Misc";

describe("Controllable Tests", function () {
  let snapshotBefore: string;
  let snapshot: string;
  let signer: SignerWithAddress;

  let helper: ControllableTest;

  before(async function () {
    snapshotBefore = await TimeUtils.snapshot();
    [signer] = await ethers.getSigners();
    helper = await DeployerUtils.deployContract(signer, 'ControllableTest') as ControllableTest;
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


  it("zero governance revert", async () => {
    const controller = await DeployerUtils.deployContract(signer, 'Controller') as Controller;
    await controller.setGovernance(Misc.ZERO_ADDRESS)
    const zeroSigner = await Misc.impersonate(Misc.ZERO_ADDRESS);
    await controller.connect(zeroSigner).acceptGovernance();
    await expect(helper.init(controller.address)).revertedWith('Zero governance');
  });

  it("zero controller revert", async () => {
    await expect(helper.init(Misc.ZERO_ADDRESS)).revertedWith('Zero controller');
  });

  it("revision test", async () => {
    await helper.increase();
    expect(await helper.revision()).eq(1);
  });

  it("prev impl test", async () => {
    await helper.increase();
    expect(await helper.previousImplementation()).eq(helper.address);
  });

  it("created block test", async () => {
    const controller = await DeployerUtils.deployContract(signer, 'Controller') as Controller;
    await helper.init(controller.address);
    expect(await helper.createdBlock()).above(0);
  });

  it("increase rev revert test", async () => {
    await expect(helper.increaseRevision(Misc.ZERO_ADDRESS)).revertedWith('Increase revision forbidden');
  });

})
