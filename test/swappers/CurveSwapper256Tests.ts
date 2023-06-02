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

const hre = require("hardhat");

describe("CurveSwapper256Tests", function () {
  let snapshotBefore: string;
  let snapshot: string;
  let signer: SignerWithAddress;
  let signer2: SignerWithAddress;
  let controller: Controller;
  let swapper: CurveSwapper256;
  let wrongToken: MockToken;

  const usdDecimals = 6;
  const oneUSD = parseUnits('1', usdDecimals);

  const am3CRV = '0xE7a24EF0C5e95Ffb0f6684b813A78F2a3AD7D171';
  const amUSDT = '0x60D55F02A771d515e077c9C2403a1ef324885CeC';
  const amUSDC = '0x1a13F4Ca1d028320A707D99520AbFefca3998b7F';
  const amDAI = '0x27F8D03b3a2196956ED754baDc28D73be8830A6e';

  const EURT_am3CRV = '0x600743B1d8A96438bD46836fD34977a00293f6Aa';
  const EURT = '0x7BDF330f423Ea880FF95fC41A280fD5eCFD3D09f';

  before(async function () {
    snapshotBefore = await TimeUtils.snapshot();
    [signer, signer2] = await ethers.getSigners();
    controller = await DeployerUtils.deployController(signer);

    swapper = await DeployerUtils.deployCurveSwapper256(signer, controller.address);

    // token for testing wrong tokens
    wrongToken = await DeployerUtils.deployMockToken(signer, 'WTOKEN');
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

  it("get price tokenIn revert", async () => {
    await expect(
        swapper.getPrice(am3CRV, wrongToken.address, amUSDC, oneUSD)
    ).revertedWith('Wrong tokenIn');
  });

  it("get price tokenOut revert", async () => {
    await expect(
        swapper.getPrice(am3CRV, amUSDC, wrongToken.address, oneUSD)
    ).revertedWith('Wrong tokenOut');
  });

  it("get tokens index", async () => {
    if(hre.network.config.chainId !== 137) {
      return;
    }
    const minter = await ICurveLpToken__factory.connect(am3CRV, signer).minter();

    const indexes = await swapper.getTokensIndex(
        minter,
        amUSDT,
        amUSDC
    );
    expect(indexes.tokenInIndex).to.equal(BigNumber.from('2'));
    expect(indexes.tokenOutIndex).to.equal(BigNumber.from('1'));

    const indexes2 = await swapper.getTokensIndex(
        minter,
        amUSDC,
        amDAI
    );
    expect(indexes2.tokenInIndex).to.equal(BigNumber.from('1'));
    expect(indexes2.tokenOutIndex).to.equal(BigNumber.from('0'));
  });

  it("from EURT to am3CRV get price from EURT_am3CRV and check uint256 values", async () => {
    if(hre.network.config.chainId !== 137) {
      return;
    }
    const price = +formatUnits(await swapper.getPrice(
        EURT_am3CRV,
        am3CRV,
        EURT,
        parseUnits('1', 18)
    ), 6)
    console.log(price);
    expect(price).approximately(1, 0.3);
  });

  it("swap EURT -> am3CRV and check uint256 values", async () => {
    if(hre.network.config.chainId !== 137) {
      return;
    }

    const amount = parseUnits('1', 6);
    const eURTHolder = await Misc.impersonate('0x50b3e08d5c3a2386e0c9585031b1152a5f0e2370')
    await IERC20__factory.connect(EURT, eURTHolder).transfer(swapper.address, amount)

    const beforeBalance = await IERC20__factory.connect(am3CRV,signer2).balanceOf(signer2.address);
    expect(beforeBalance).to.equal(BigNumber.from('0'));

    await swapper.swap(
        EURT_am3CRV,
        EURT,
        am3CRV,
        signer2.address,
        50
    );
    const afterBalance = +formatUnits(
        await IERC20__factory.connect(am3CRV,signer2).balanceOf(signer2.address)
        , 18);
    console.log(afterBalance);
    expect(afterBalance).approximately(1, 0.2);
  });

});
