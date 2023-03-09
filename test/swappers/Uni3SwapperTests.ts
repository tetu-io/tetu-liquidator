import {ethers} from "hardhat";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {expect} from "chai";
import {
  Controller,
  IERC20__factory,
  IERC20Metadata__factory,
  MockToken,
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

// tslint:disable-next-line:no-var-requires
const hre = require("hardhat");

describe("Uni3SwapperTests", function () {
  let snapshotBefore: string;
  let snapshot: string;
  let signer: SignerWithAddress;
  let signer2: SignerWithAddress;
  let controller: Controller;
  let swapper: Uni3Swapper;
  let factory: UniswapV3Factory;

  let usdc: MockToken;
  let tetu: MockToken;
  let matic: MockToken;

  before(async function () {
    snapshotBefore = await TimeUtils.snapshot();
    [signer, signer2] = await ethers.getSigners();
    controller = await DeployerUtils.deployController(signer);

    swapper = await DeployerUtils.deployUni3Swapper(signer, controller.address);

    const uniData = await UniswapUtils.deployUniswapV3(signer);
    factory = uniData.factory;

    usdc = await DeployerUtils.deployMockToken(signer, 'USDC', 6);
    tetu = await DeployerUtils.deployMockToken(signer, 'TETU');
    matic = await DeployerUtils.deployMockToken(signer, 'WMATIC');
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

  it("swap with dec 18 to dec 6 test", async () => {
    // todo implement tests on local chain
    // const tetuUsdc: UniswapV3Pool = await createPair(signer, factory, usdc.address, tetu.address);
    // const bal = await usdc.balanceOf(signer.address);
    // await tetu.transfer(swapper.address, parseUnits('10000'))
    // await swapper.swap(
    //   tetuUsdc.address,
    //   tetu.address,
    //   usdc.address,
    //   signer.address,
    //   6_000
    // );
    // const balAfter = await usdc.balanceOf(signer.address);
    // expect(balAfter.sub(bal)).above(parseUnits('4700', 6));
  });

  it("swap lido to usdc", async () => {
    if(hre.network.config.chainId !== 137) {
      return;
    }
    const lidoHolder = await Misc.impersonate('0x87D93d9B2C672bf9c9642d853a8682546a5012B5')
    const LIDO = '0xC3C7d422809852031b44ab29EEC9F1EfF2A58756';
    const USDC = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';
    const POOL = '0x3d0ACD52eE4A9271a0fFE75F9b91049152BaC64b'

    await IERC20__factory.connect(LIDO, lidoHolder).transfer(swapper.address, parseUnits('1000'))
    await swapper.swap(
      POOL,
      LIDO,
      USDC,
      signer.address,
      6_000
    );

  });

  it("lido to usdc price", async () => {
    if(hre.network.config.chainId !== 137) {
      return;
    }
    const LIDO = '0xC3C7d422809852031b44ab29EEC9F1EfF2A58756';
    const USDC = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';
    const POOL = '0x3d0ACD52eE4A9271a0fFE75F9b91049152BaC64b'

    const price = +formatUnits(await swapper.getPrice(
      POOL,
      LIDO,
      USDC,
      parseUnits('1')
    ), 6)

    console.log(price);
    expect(price).approximately(3, 1);

    const price2 = +formatUnits(await swapper.getPrice(
      POOL,
      USDC,
      LIDO,
      parseUnits('1', 6)
    ))

    console.log(price2);
    expect(price2).approximately(0.34, 0.01)
  });

  it("lido to matic price", async () => {
    if(hre.network.config.chainId !== 137) {
      return;
    }
    const LIDO = '0xC3C7d422809852031b44ab29EEC9F1EfF2A58756';
    const MATIC = '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270';
    const POOL = '0xd866fac7db79994d08c0ca2221fee08935595b4b'

    const price = +formatUnits(await swapper.getPrice(
      POOL,
      LIDO,
      MATIC,
      parseUnits('1')
    ))

    console.log(price);
    expect(price).approximately(3, 1);

    const price2 = +formatUnits(await swapper.getPrice(
      POOL,
      MATIC,
      LIDO,
      parseUnits('1')
    ))

    console.log(price2);
    expect(price2).approximately(0.400, 0.1)
  });

  it("usdt to usdc price", async () => {
    if(hre.network.config.chainId !== 137) {
      return;
    }
    const USDT = '0xc2132D05D31c914a87C6611C10748AEb04B58e8F';
    const USDC = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';
    const POOL = '0xDaC8A8E6DBf8c690ec6815e0fF03491B2770255D'

    const price = +formatUnits(await swapper.getPrice(
        POOL,
        USDT,
        USDC,
        parseUnits('1', 6)
    ), 6)

    console.log(price);
    expect(price).approximately(1, 0.01);

    const price2 = +formatUnits(await swapper.getPrice(
        POOL,
        USDC,
        USDT,
        parseUnits('1', 6)
    ), 6)

    console.log(price2);
    expect(price2).approximately(1, 0.01)
  });

  it("wbtc to usdc price", async () => {
    if(hre.network.config.chainId !== 137) {
      return;
    }
    const WBTC = '0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6';
    const USDC = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';
    const POOL = '0x847b64f9d3A95e977D157866447a5C0A5dFa0Ee5'

    const price = +formatUnits(await swapper.getPrice(
        POOL,
        WBTC,
        USDC,
        0
    ), 6)

    console.log(price);
    expect(price).approximately(22468, 2000);

    const price2 = +formatUnits(await swapper.getPrice(
        POOL,
        USDC,
        WBTC,
        0
    ), 8)

    console.log(price2);
    expect(price2).approximately(0.0000445283, 0.00001)
  });

  it("wbtc to eth price", async () => {
    if(hre.network.config.chainId !== 137) {
      return;
    }
    const WBTC = '0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6';
    const WETH = MaticAddresses.WETH_TOKEN;
    const POOL = '0x50eaEDB835021E4A108B7290636d62E9765cc6d7'

    const price = +formatUnits(await swapper.getPrice(
        POOL,
        WBTC,
        WETH,
        0
    ), 18)

    console.log(price);
    expect(price).approximately(14, 5);

    const price2 = +formatUnits(await swapper.getPrice(
        POOL,
        WETH,
        WBTC,
        0
    ), 8)

    console.log(price2);
    expect(price2).approximately(0.07, 0.05)
  });

});


async function createPair(signer: SignerWithAddress, factory: UniswapV3Factory, token1: string, token2: string, fee = 10000) {
  console.log("CREATE PAIR", await IERC20Metadata__factory.connect(token1, signer).symbol(), token1, await IERC20Metadata__factory.connect(token2, signer).symbol(), token2)
  await factory.createPool(token1, token2, fee);
  const pairAdr = await factory.getPool(token1, token2, fee);
  console.log("pair created", pairAdr)
  const pair = UniswapV3Pool__factory.connect(pairAdr, signer);
  await IERC20__factory.connect(token1, signer).approve(pairAdr, parseUnits('100000', await IERC20Metadata__factory.connect(token1, signer).decimals()))
  await IERC20__factory.connect(token2, signer).approve(pairAdr, parseUnits('200000', await IERC20Metadata__factory.connect(token2, signer).decimals()))
  await pair.initialize('72472639515455973770835911310858550');
  await pair.mint(signer.address, -280_000, -279_000, parseUnits('0.01'), '0x');
  console.log("minted pair position");
  return pair;
}
