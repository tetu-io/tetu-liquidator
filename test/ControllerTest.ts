import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {ethers} from "hardhat";
import chai from "chai";
import {Controller} from "../typechain";
import {TimeUtils} from "./TimeUtils";
import {DeployerUtils} from "../scripts/utils/DeployerUtils";

const {expect} = chai;

describe("controller tests", function () {

  let snapshotBefore: string;
  let snapshot: string;

  let owner: SignerWithAddress;
  let owner2: SignerWithAddress;
  let controller: Controller;


  before(async function () {
    snapshotBefore = await TimeUtils.snapshot();
    [owner, owner2] = await ethers.getSigners();
    controller = await DeployerUtils.deployContract(owner, 'Controller') as Controller;
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

  it("set governance and accept test", async function () {
    await controller.setGovernance(owner2.address);
    expect(await controller.pendingGovernance()).eq(owner2.address);
    await expect(controller.acceptGovernance()).revertedWith('Not pending gov');
    await controller.connect(owner2).acceptGovernance();
    expect(await controller.governance()).eq(owner2.address);
  });

  it("is operator test", async function () {
    expect(await controller.isOperator(owner.address)).eq(true);
  });

  it("change operator status test", async function () {
    await controller.changeOperatorStatus(owner.address, false)
    expect(await controller.isOperator(owner.address)).eq(false);
  });

  it("change operator status from not gov revert", async function () {
    await expect(controller.connect(owner2).changeOperatorStatus(owner.address, false)).revertedWith('!gov');
  });

  it("update proxy wrong arr revert", async function () {
    await expect(controller.updateProxies([owner.address], [])).revertedWith('Wrong arrays');
  });

});
