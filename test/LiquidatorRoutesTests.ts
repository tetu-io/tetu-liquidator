import {ethers} from "hardhat";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {expect} from "chai";
import {DeployerUtils} from "../scripts/utils/DeployerUtils";
import {TimeUtils} from "./TimeUtils";
import {
  Controller,
  IERC20__factory,
  IERC20Metadata__factory,
  MockToken,
  TetuLiquidator,
  UniswapV2Factory,
  UniswapV2Pair,
  UniswapV2Pair__factory
} from "../typechain";
import {parseUnits} from "ethers/lib/utils";
import {Misc} from "../scripts/utils/Misc";
import {UniswapUtils} from "./UniswapUtils";


describe("Liquidator routes Tests", function () {
  let snapshotBefore: string;
  let snapshot: string;
  let signer: SignerWithAddress;
  let controller: Controller;
  let liquidator: TetuLiquidator;
  let factory: UniswapV2Factory;

  let bc1: MockToken;
  let bc2: MockToken;
  let t3: MockToken;
  let t4: MockToken;
  let t5: MockToken;
  let t6: MockToken;
  let t7: MockToken;
  let bc8: MockToken;

  let p12: UniswapV2Pair;
  let p13: UniswapV2Pair;
  let p16: UniswapV2Pair;
  let p17: UniswapV2Pair;
  let p23: UniswapV2Pair;
  let p27: UniswapV2Pair;
  let p28: UniswapV2Pair;
  let p34: UniswapV2Pair;
  let p35: UniswapV2Pair;
  let p36: UniswapV2Pair;
  let p37: UniswapV2Pair;
  let p15: UniswapV2Pair;
  let p26: UniswapV2Pair;
  let p45: UniswapV2Pair;
  let p46: UniswapV2Pair;
  let p56: UniswapV2Pair;
  let p57: UniswapV2Pair;

  before(async function () {
    snapshotBefore = await TimeUtils.snapshot();
    [signer] = await ethers.getSigners();
    controller = await DeployerUtils.deployController(signer);

    liquidator = await DeployerUtils.deployTetuLiquidator(signer, controller.address);

    bc1 = await DeployerUtils.deployMockToken(signer, 'token1', 6);
    bc2 = await DeployerUtils.deployMockToken(signer, 'token2');
    t3 = await DeployerUtils.deployMockToken(signer, 'token3');
    t4 = await DeployerUtils.deployMockToken(signer, 'token4');
    t5 = await DeployerUtils.deployMockToken(signer, 'token5');
    t6 = await DeployerUtils.deployMockToken(signer, 'token6');
    t7 = await DeployerUtils.deployMockToken(signer, 'token7');
    bc8 = await DeployerUtils.deployMockToken(signer, 'token8');

    const uniData = await UniswapUtils.deployUniswapV2(signer);
    factory = uniData.factory;

    p12 = await createPair(signer, factory, bc1.address, bc2.address);
    p27 = await createPair(signer, factory, t7.address, bc2.address);
    p28 = await createPair(signer, factory, bc8.address, bc2.address);
    p23 = await createPair(signer, factory, bc2.address, t3.address);
    p13 = await createPair(signer, factory, t3.address, bc1.address);
    p16 = await createPair(signer, factory, t6.address, bc1.address);
    p17 = await createPair(signer, factory, t7.address, bc1.address);
    p34 = await createPair(signer, factory, t3.address, t4.address);
    p35 = await createPair(signer, factory, t3.address, t5.address);
    p36 = await createPair(signer, factory, t3.address, t6.address);
    p37 = await createPair(signer, factory, t3.address, t7.address);
    p15 = await createPair(signer, factory, bc1.address, t5.address);
    p26 = await createPair(signer, factory, bc2.address, t6.address);
    p45 = await createPair(signer, factory, t4.address, t5.address);
    p46 = await createPair(signer, factory, t4.address, t6.address);
    p56 = await createPair(signer, factory, t5.address, t6.address);
    p57 = await createPair(signer, factory, t5.address, t7.address);
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

  it("build route: simple bc", async () => {
    await addBC(liquidator, p12, bc1, bc2);
    await testRoute(liquidator, bc1, bc2, 1);
    await testRoute(liquidator, bc2, bc1, 1);
  });

  it("build route: simple 1 route", async () => {
    await addPool(liquidator, p46, t4, t6);
    await testRoute(liquidator, t4, t6, 1);
  });

  it("build route: POOLin + bc for POOLin", async () => {
    await addBC(liquidator, p12, bc1, bc2);
    await addPool(liquidator, p16, t6, bc1);
    await testRoute(liquidator, t6, bc2, 2);
  });

  it("build route: POOLin + POOLout", async () => {
    await addPool(liquidator, p34, t3, t4);
    await addPool(liquidator, p46, t6, t4);
    await testRoute(liquidator, t3, t6, 2);
  });

  it("build route: in + POOLout", async () => {
    await addPool(liquidator, p34, t3, t4);
    await addPool(liquidator, p36, t6, t3);
    await testRoute(liquidator, t3, t6, 1);
  });

  it("build route: POOLin + BC + POOLout", async () => {
    await addBC(liquidator, p12, bc1, bc2);
    await addPool(liquidator, p13, t3, bc1);
    await addPool(liquidator, p26, t6, bc2);
    await testRoute(liquidator, t3, t6, 3);
  });

  it("build route: POOLin + POOLin2", async () => {
    await addPool(liquidator, p12, bc1, bc2);
    await addPool(liquidator, p23, bc2, t3);
    await addPool(liquidator, p34, t3, t4);
    await testRoute(liquidator, bc1, t3, 2);
  });

  it("build route: POOLin + POOLin2 + POOLout", async () => {
    await addPool(liquidator, p12, bc1, bc2);
    await addPool(liquidator, p23, bc2, t3);
    await addPool(liquidator, p34, t4, t3);
    await testRoute(liquidator, bc1, t4, 3);
  });

  it("build route: POOLin + POOLin2 + BC out", async () => {
    await addBC(liquidator, p12, bc2, bc1);
    await addPool(liquidator, p46, t4, t6);
    await addPool(liquidator, p26, t6, bc2);
    await addPool(liquidator, p12, bc2, bc1);
    await addPool(liquidator, p13, bc1, t3);
    await testRoute(liquidator, t4, bc1, 3);
  });

  it("build route: POOLin + POOLout2 + POOLout", async () => {
    await addPool(liquidator, p37, t7, t3);
    await addPool(liquidator, p17, bc1, t7);
    await addPool(liquidator, p57, t5, t7);
    await addPool(liquidator, p56, t6, t5);
    await testRoute(liquidator, bc1, t6, 3);
  });

  it("build route: POOLin + POOLin2 + POOLout2 + POOLout", async () => {
    await addPool(liquidator, p17, bc1, t7);
    await addPool(liquidator, p37, t7, t3);
    await addPool(liquidator, p35, t5, t3);
    await addPool(liquidator, p56, t6, t5);
    await testRoute(liquidator, bc1, t6, 4);
  });

  it("build route: POOLin + POOLin2 + BC + POOLout2 + POOLout", async () => {
    await addPool(liquidator, p17, bc1, t7);
    await addPool(liquidator, p37, t7, t3);
    await addBC(liquidator, p34, t3, t4);
    await addPool(liquidator, p45, t5, t4);
    await addPool(liquidator, p56, t6, t5);
    await testRoute(liquidator, bc1, t6, 5);
  });

  it("build route: POOLin + BC + POOLout2 + POOLout", async () => {
    await addPool(liquidator, p27, t7, bc2);
    await addPool(liquidator, p17, bc1, t7);
    await addBC(liquidator, p37, t7, t3);
    await addPool(liquidator, p35, t5, t3);
    await addPool(liquidator, p56, t6, t5);
    await testRoute(liquidator, bc1, t6, 4);
  });

  it("build route: in + BC + POOLout2 + POOLout", async () => {
    await addPool(liquidator, p27, t7, bc2);
    await addPool(liquidator, p12, bc2, bc1);

    await addBC(liquidator, p37, t7, t3);
    await addPool(liquidator, p35, t5, t3);
    await addPool(liquidator, p56, t6, t5);
    await testRoute(liquidator, t7, t6, 3);
  });

  it("error route: in not found", async () => {
    await errorRoute(liquidator, t4, t6, 'L: Not found pool for tokenIn');
  });

  it("error route: out not found", async () => {
    await addPool(liquidator, p35, t4, t3);
    await errorRoute(liquidator, t4, t6, 'L: Not found pool for tokenOut');
  });

  it("error route: in2 not found", async () => {
    await addPool(liquidator, p35, t4, t3);
    await addPool(liquidator, p16, t6, bc1);
    await errorRoute(liquidator, t4, t6, 'L: Not found pool for tokenIn2');
  });

  it("error route: out2 not found", async () => {
    await addPool(liquidator, p35, t4, t3);
    await addPool(liquidator, p35, t3, t5);
    await addPool(liquidator, p16, t6, bc1);
    await errorRoute(liquidator, t4, t6, 'L: Not found pool for tokenOut2');
  });

  it("error route: route not found", async () => {
    await addPool(liquidator, p35, t4, t3);
    await addPool(liquidator, p35, t3, t5);
    await addPool(liquidator, p16, t6, bc1);
    await addPool(liquidator, p16, bc1, bc2);
    await errorRoute(liquidator, t4, t6, 'L: Liquidation path not found');
  });

  describe("with some routes", function () {

    before(async function () {
      await addBC(liquidator, p12, bc1, bc2);
      await addBC(liquidator, p28, bc8, bc2);

      await addPool(liquidator, p12, bc1, bc2);
      await addPool(liquidator, p12, bc2, bc1);
      await addPool(liquidator, p28, bc8, bc2);

      await addPool(liquidator, p13, t3, bc1);
      await addPool(liquidator, p16, t6, bc1);
      await addPool(liquidator, p46, t4, t6);
      await addPool(liquidator, p56, t5, t6);
      await addPool(liquidator, p57, t7, t5);
    });

    it("build route for bc1 => bc2", async () => {
      const route = await liquidator.buildRoute(bc1.address, bc2.address);
      expect(route.errorMessage).eq('');
      expect(route.route.length).eq(1);
      expect(route.route[0].pool).eq(p12.address);
      expect(route.route[0].tokenIn).eq(bc1.address);
      expect(route.route[0].tokenOut).eq(bc2.address);
      checkRoute(route.route, bc1, bc2);
    });

    it("build route bc1 => t3", async () => {
      const route = await liquidator.buildRoute(bc1.address, t3.address);
      expect(route.errorMessage).eq('');
      expect(route.route.length).eq(1);
      expect(route.route[0].pool).eq(p13.address);
      expect(route.route[0].tokenIn).eq(bc1.address);
      expect(route.route[0].tokenOut).eq(t3.address);
      checkRoute(route.route, bc1, t3);
    });

    it("build route bc2 => t3", async () => {
      const route = await liquidator.buildRoute(bc2.address, t3.address);
      expect(route.errorMessage).eq('');
      expect(route.route.length).eq(2);

      expect(route.route[0].pool).eq(p12.address);
      expect(route.route[0].tokenIn).eq(bc2.address);
      expect(route.route[0].tokenOut).eq(bc1.address);

      expect(route.route[1].pool).eq(p13.address);
      expect(route.route[1].tokenIn).eq(bc1.address);
      expect(route.route[1].tokenOut).eq(t3.address);
      checkRoute(route.route, bc2, t3);
    });

    it("build route t4 => t6", async () => {
      const route = await liquidator.buildRoute(t4.address, t6.address);
      expect(route.errorMessage).eq('');
      expect(route.route.length).eq(1);

      expect(route.route[0].pool).eq(p46.address);
      expect(route.route[0].tokenIn).eq(t4.address);
      expect(route.route[0].tokenOut).eq(t6.address);

      checkRoute(route.route, t4, t6);
    });

    it("build route bc1 => t6", async () => {
      const route = await liquidator.buildRoute(bc1.address, t6.address);
      expect(route.errorMessage).eq('');
      expect(route.route.length).eq(1);

      expect(route.route[0].pool).eq(p16.address);
      expect(route.route[0].tokenIn).eq(bc1.address);
      expect(route.route[0].tokenOut).eq(t6.address);

      checkRoute(route.route, bc1, t6);
    });

    it("build route t3 => t6", async () => {
      const route = await liquidator.buildRoute(t3.address, t6.address);
      expect(route.errorMessage).eq('');
      expect(route.route.length).eq(2);

      expect(route.route[0].pool).eq(p13.address);
      expect(route.route[0].tokenIn).eq(t3.address);
      expect(route.route[0].tokenOut).eq(bc1.address);

      expect(route.route[1].pool).eq(p16.address);
      expect(route.route[1].tokenIn).eq(bc1.address);
      expect(route.route[1].tokenOut).eq(t6.address);

      checkRoute(route.route, t3, t6);
    });

    it("build route bc2 => t6", async () => {
      const route = await liquidator.buildRoute(bc2.address, t6.address);
      expect(route.errorMessage).eq('');
      expect(route.route.length).eq(2);

      expect(route.route[0].pool).eq(p12.address);
      expect(route.route[0].tokenIn).eq(bc2.address);
      expect(route.route[0].tokenOut).eq(bc1.address);

      expect(route.route[1].pool).eq(p16.address);
      expect(route.route[1].tokenIn).eq(bc1.address);
      expect(route.route[1].tokenOut).eq(t6.address);

      checkRoute(route.route, bc2, t6);
    });

    it("build route t6 => bc2", async () => {
      const route = await liquidator.buildRoute(t6.address, bc2.address);
      expect(route.errorMessage).eq('');
      expect(route.route.length).eq(2);

      expect(route.route[0].pool).eq(p16.address);
      expect(route.route[0].tokenIn).eq(t6.address);
      expect(route.route[0].tokenOut).eq(bc1.address);

      expect(route.route[1].pool).eq(p12.address);
      expect(route.route[1].tokenIn).eq(bc1.address);
      expect(route.route[1].tokenOut).eq(bc2.address);

      checkRoute(route.route, t6, bc2);
    });

    it("build route t5 => bc2", async () => {
      const route = await liquidator.buildRoute(t5.address, bc2.address);
      expect(route.errorMessage).eq('');
      expect(route.route.length).eq(3);

      expect(route.route[0].pool).eq(p56.address);
      expect(route.route[0].tokenIn).eq(t5.address);
      expect(route.route[0].tokenOut).eq(t6.address);

      expect(route.route[1].pool).eq(p16.address);
      expect(route.route[1].tokenIn).eq(t6.address);
      expect(route.route[1].tokenOut).eq(bc1.address);

      expect(route.route[2].pool).eq(p12.address);
      expect(route.route[2].tokenIn).eq(bc1.address);
      expect(route.route[2].tokenOut).eq(bc2.address);

      checkRoute(route.route, t5, bc2);
    });

    it("build route t7 => t4", async () => {
      await testRoute(liquidator, t7, t4, 3);
    });

    it("build route t6 => bc8", async () => {
      await testRoute(liquidator, t6, bc8, 3);
    });

    it("build route t4 => bc1", async () => {
      await testRoute(liquidator, t4, bc1, 2);
    });

  });


});

async function errorRoute(liquidator: TetuLiquidator, tokenIn: MockToken, tokenOut: MockToken, msg: string) {
  const route = await liquidator.buildRoute(tokenIn.address, tokenOut.address);
  expect(route.errorMessage).eq(msg);
  expect(route.route.length).eq(0);
}

async function testRoute(liquidator: TetuLiquidator, tokenIn: MockToken, tokenOut: MockToken, size: number) {
  const route = await liquidator.buildRoute(tokenIn.address, tokenOut.address);

  try {
    for (let i = 0; i < size; i++) {
      const r = route.route[i];
      const tIn = IERC20Metadata__factory.connect(r.tokenIn, liquidator.signer);
      const tOut = IERC20Metadata__factory.connect(r.tokenOut, liquidator.signer);
      console.log(await tIn.symbol(), '=>', await tOut.symbol());
    }
  } catch (e) {
  }

  expect(route.errorMessage).eq('');
  expect(route.route.length).eq(size);
  checkRoute(route.route, tokenIn, tokenOut);
}

function checkRoute(route: ([string, string, string, string] & {
                      pool: string;
                      swapper: string;
                      tokenIn: string;
                      tokenOut: string;
                    })[],
                    tokenIn: MockToken,
                    tokenOut: MockToken) {
  expect(route[0].tokenIn).eq(tokenIn.address);
  expect(route[route.length - 1].tokenOut).eq(tokenOut.address);
}

async function addPool(liq: TetuLiquidator, pair: UniswapV2Pair, tokenIn: MockToken, tokenOut: MockToken) {
  await liq.addLargestPools([
    {
      pool: pair.address,
      swapper: Misc.ZERO_ADDRESS,
      tokenIn: tokenIn.address,
      tokenOut: tokenOut.address,
    }
  ], false)
}

async function addBC(liq: TetuLiquidator, pair: UniswapV2Pair, tokenIn: MockToken, tokenOut: MockToken) {
  await liq.addBlueChipsPools([
    {
      pool: pair.address,
      swapper: Misc.ZERO_ADDRESS,
      tokenIn: tokenIn.address,
      tokenOut: tokenOut.address,
    }
  ], false)
}

async function createPair(signer: SignerWithAddress, factory: UniswapV2Factory, token1: string, token2: string) {
  await factory.createPair(token1, token2);
  const pairAdr = await factory.getPair(token1, token2);
  const pair = UniswapV2Pair__factory.connect(pairAdr, signer);
  await IERC20__factory.connect(token1, signer).transfer(pairAdr, parseUnits('1', await IERC20Metadata__factory.connect(token1, signer).decimals()))
  await IERC20__factory.connect(token2, signer).transfer(pairAdr, parseUnits('1', await IERC20Metadata__factory.connect(token2, signer).decimals()))
  await pair.mint(signer.address);
  return pair;
}
