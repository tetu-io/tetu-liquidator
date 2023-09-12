import {ethers} from "hardhat";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {expect} from "chai";
import {
  Controller,
  IERC20__factory,
  IERC20Metadata__factory,
  MockToken, Pancake3Swapper, TetuLiquidator__factory,
  Uni2Swapper, Uni3Swapper,
  UniswapV2Factory,
  UniswapV2Pair,
  UniswapV2Pair__factory, UniswapV3Factory, UniswapV3Pool, UniswapV3Pool__factory
} from "../../typechain";
import {formatUnits, parseUnits} from "ethers/lib/utils";
import {TimeUtils} from "../TimeUtils";
import {DeployerUtils} from "../../scripts/utils/DeployerUtils";
import {Misc} from "../../scripts/utils/Misc";
import {UniswapUtils} from "../UniswapUtils";
import {MaticAddresses} from "../../scripts/addresses/MaticAddresses";
import {RunHelper} from "../../scripts/utils/RunHelper";

// tslint:disable-next-line:no-var-requires
const hre = require("hardhat");

// simplified tests because no logic differences from Uni3Swapper (only interface alignment with pancakeSwapV3)
// slot0() method returns (sqrtPriceX96 uint160, tick int24, observationIndex uint16, observationCardinality uint16, observationCardinalityNext uint16, feeProtocol uint32, unlocked bool)
// feeProtocol uint32 vs feeProtocol uint8 in UniV3
describe("Pancake3SwapperTests", function () {
  let snapshotBefore: string;
  let snapshot: string;
  let signer: SignerWithAddress;
  let signer2: SignerWithAddress;
  let controller: Controller;
  let swapper: Pancake3Swapper;

  before(async function () {
    snapshotBefore = await TimeUtils.snapshot();
    [signer, signer2] = await ethers.getSigners();
    controller = await DeployerUtils.deployController(signer);

    swapper = await DeployerUtils.deployPancake3Swapper(signer, controller.address);
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

  it("swap weth to btcb", async () => {
    if (hre.network.config.chainId !== 56) {
      return;
    }
    const ethHolder = await Misc.impersonate('0x5a52E96BAcdaBb82fd05763E25335261B270Efcb')
    const WETH = '0x2170ed0880ac9a755fd29b2688956bd959f933f8';
    const BTCB = '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c';
    const POOL = '0xD4dCA84E1808da3354924cD243c66828cf775470'

    await IERC20__factory.connect(WETH, ethHolder).transfer(swapper.address, parseUnits('1000'))
    await swapper.swap(
      POOL,
      WETH,
      BTCB,
      signer.address,
      6_000,
      {gasLimit: 10_000_000}
    );

  });

});
