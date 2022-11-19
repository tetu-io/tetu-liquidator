import {ethers, web3} from "hardhat";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {BigNumber, BigNumberish, ContractFactory, utils} from "ethers";
import {Misc} from "./Misc";
import logSettings from "../../log_settings";
import {Logger} from "tslog";
import {parseEther, parseUnits} from "ethers/lib/utils";
import {
  Authorizer,
  BalancerWeightedPoolSwapper__factory,
  BalancerStablePoolSwapper__factory,
  Controller,
  DystFactory,
  DystopiaSwapper,
  DystopiaSwapper__factory,
  MockToken,
  ProxyControlled,
  TetuLiquidator__factory,
  Uni2Swapper__factory,
  UniswapV2Factory,
  Vault,
  Vault__factory,
  WeightedPool,
  StablePool, Uni3Swapper__factory
} from "../../typechain";
import {VerifyUtils} from "./VerifyUtils";
import {RunHelper} from "./RunHelper";
import {Libraries} from "@nomiclabs/hardhat-ethers/types";
import {deployContract} from "../deploy/DeployContract";

// tslint:disable-next-line:no-var-requires
const hre = require("hardhat");
const log: Logger = new Logger(logSettings);


const libraries = new Map<string, string>([
  ['VeTetu', 'VeTetuLogo']
]);

const PAUSE_WINDOW_DURATION = BigNumber.from(90 * 24 * 3600);
const BUFFER_PERIOD_DURATION = BigNumber.from(30 * 24 * 3600);

export class DeployerUtils {

  // ************ CONTRACT DEPLOY **************************

  public static async deployContract<T extends ContractFactory>(
    signer: SignerWithAddress,
    name: string,
    // tslint:disable-next-line:no-any
    ...args: any[]
  ) {
    return deployContract(hre, signer, name, ...args);
  }

  public static async deployMockToken(signer: SignerWithAddress, name = 'MOCK', decimals = 18, amount: string = '1000000') {
    const token = await DeployerUtils.deployContract(signer, 'MockToken', name + '_MOCK_TOKEN', name, decimals) as MockToken;
    await RunHelper.runAndWait(() => token.mint(signer.address, parseUnits(amount, decimals)));
    return token;
  }


  public static async deployController(signer: SignerWithAddress) {
    return await DeployerUtils.deployContract(signer, 'Controller') as Controller;
  }

  public static async deployProxy(signer: SignerWithAddress, contract: string) {
    const logic = await DeployerUtils.deployContract(signer, contract);
    const proxy = await DeployerUtils.deployContract(signer, 'ProxyControlled') as ProxyControlled;
    await RunHelper.runAndWait(() => proxy.initProxy(logic.address, {gasLimit: 8_000_000}));
    return proxy.address;
  }

  public static async deployTetuLiquidator(signer: SignerWithAddress, controller: string) {
    const proxy = await DeployerUtils.deployProxy(signer, 'TetuLiquidator')
    const liq = TetuLiquidator__factory.connect(proxy, signer);
    await RunHelper.runAndWait(() => liq.init(controller, {gasLimit: 8_000_000}));
    return liq;
  }

  public static async deployUni2Swapper(signer: SignerWithAddress, controller: string) {
    const proxy = await DeployerUtils.deployProxy(signer, 'Uni2Swapper')
    const swapper = Uni2Swapper__factory.connect(proxy, signer);
    await RunHelper.runAndWait(() => swapper.init(controller, {gasLimit: 8_000_000}))
    return swapper;
  }

  public static async deployUni3Swapper(signer: SignerWithAddress, controller: string) {
    const proxy = await DeployerUtils.deployProxy(signer, 'Uni3Swapper')
    const swapper = Uni3Swapper__factory.connect(proxy, signer);
    await RunHelper.runAndWait(() => swapper.init(controller, {gasLimit: 8_000_000}))
    return swapper;
  }

  public static async deployDystopiaSwapper(signer: SignerWithAddress, controller: string) {
    const proxy = await DeployerUtils.deployProxy(signer, 'DystopiaSwapper')
    const swapper = DystopiaSwapper__factory.connect(proxy, signer);
    await RunHelper.runAndWait(() => swapper.init(controller, {gasLimit: 8_000_000}))
    return swapper;
  }

  public static async deployBalancerWeightedPoolSwapper(signer: SignerWithAddress, controller: string, balancerVault: string) {
    const proxy = await DeployerUtils.deployProxy(signer, 'BalancerWeightedPoolSwapper')
    const swapper = BalancerWeightedPoolSwapper__factory.connect(proxy, signer);
    await RunHelper.runAndWait(() => swapper.init(controller, balancerVault, {gasLimit: 8_000_000}))
    return swapper;
  }

  public static async deployBalancerStablePoolSwapper(signer: SignerWithAddress, controller: string, balancerVault: string) {
    const proxy = await DeployerUtils.deployProxy(signer, 'BalancerStablePoolSwapper')
    const swapper = BalancerStablePoolSwapper__factory.connect(proxy, signer);
    await RunHelper.runAndWait(() => swapper.init(controller, balancerVault, {gasLimit: 8_000_000}))
    return swapper;
  }

  public static async deployDystopia(signer: SignerWithAddress) {
    const factory = await DeployerUtils.deployContract(signer, 'DystFactory', signer.address) as DystFactory;
    const netToken = (await DeployerUtils.deployMockToken(signer, 'WETH')).address.toLowerCase();
    return {
      factory,
      netToken
    }
  }

  public static async deployBalancer(
    signer: SignerWithAddress,
    pauseWindowDuration = PAUSE_WINDOW_DURATION,
    bufferPeriodDuration = BUFFER_PERIOD_DURATION
  ) {
    const authorizer = await DeployerUtils.deployContract(signer, 'Authorizer', signer.address) as Authorizer;

    const netToken = await DeployerUtils.deployMockToken(signer, 'WMATIC');

    const vault = await DeployerUtils.deployContract(signer, 'Vault',
      authorizer.address,
      netToken.address,
      pauseWindowDuration,
      bufferPeriodDuration
    ) as Vault;

    return {
      authorizer,
      vault,
      netToken,
    }
  }

  /**
   *
   * @param signer
   * @param vaultAddress
   * @param tokens array of token addresses. must be sorted.
   * @param normalizedWeights
   * @param initialBalances
   * @param swapFee
   * @param pauseWindowDuration
   * @param bufferPeriodDuration
   */
  public static async deployAndInitBalancerWeightedPool(
    signer: SignerWithAddress,
    vaultAddress: string,
    tokens: MockToken[],
    normalizedWeights: BigNumber[],
    initialBalances: BigNumber[],
    swapFee = parseEther('0.0025'),
    pauseWindowDuration = PAUSE_WINDOW_DURATION,
    bufferPeriodDuration = BUFFER_PERIOD_DURATION
  ) {

    const weightedPoolParams = [
      vaultAddress,
      'Balancer Weighted Pool',
      'B-WEIGHTED',
      tokens.map(t => t.address),
      normalizedWeights,
      tokens.map(() => ethers.constants.AddressZero),
      swapFee,
      pauseWindowDuration,
      bufferPeriodDuration,
      signer.address
    ];

    const weightedPool = await DeployerUtils.deployContract(signer, 'WeightedPool',
      ...weightedPoolParams) as WeightedPool;

    const vault = await Vault__factory.connect(vaultAddress, signer);

    for (let i = 0; i < tokens.length; i++) {
      await tokens[i].approve(vaultAddress, initialBalances[i])
    }

    const JOIN_KIND_INIT = 0;

    const initUserData = ethers.utils.defaultAbiCoder.encode(
      ["uint256", "uint256[]"],
      [JOIN_KIND_INIT, initialBalances]
    );

    const joinPoolRequest = {
      assets: tokens.map(t => t.address),
      maxAmountsIn: initialBalances,
      userData: initUserData,
      fromInternalBalance: false
    }

    const poolId = await weightedPool.getPoolId();
    await vault.joinPool(poolId, signer.address, signer.address, joinPoolRequest);
    return weightedPool;
  }

  public static async deployAndInitBalancerStablePool(
    signer: SignerWithAddress,
    vaultAddress: string,
    tokens: MockToken[],
    initialBalanceUnits = '100000',
    swapFee = parseEther('0.0004'),
    amplificationParameter = BigNumber.from('200'), // 60
    pauseWindowDuration = PAUSE_WINDOW_DURATION,
    bufferPeriodDuration = BUFFER_PERIOD_DURATION
  ) {

    const tokensSorted = tokens.sort((a, b) => a.address > b.address ? 1 : -1);
    const tokenAddressesSorted = tokensSorted.map(t => t.address);

    const stablePoolParams = [
      vaultAddress,
      'Balancer Stable Pool',
      'B-STABLE',
      tokenAddressesSorted,
      amplificationParameter,
      swapFee,
      pauseWindowDuration,
      bufferPeriodDuration,
      signer.address
    ];

    const stablePool = await DeployerUtils.deployContract(signer, 'StablePool',
      ...stablePoolParams) as StablePool;

    // Initialize stable pool

    const vault = await Vault__factory.connect(vaultAddress, signer);

    const initialBalances: BigNumberish[] = [];
    for (const token of tokensSorted) {
      const decimals = await token.decimals();
      const initialBalance = parseUnits(initialBalanceUnits, decimals);
      await token.approve(vaultAddress, initialBalance);
      initialBalances.push(initialBalance);
    }

    const JOIN_KIND_INIT = 0;

    const initUserData = ethers.utils.defaultAbiCoder.encode(
      ["uint256", "uint256[]"],
      [JOIN_KIND_INIT, initialBalances]
    );

    const joinPoolRequest = {
      assets: tokenAddressesSorted,
      maxAmountsIn: initialBalances,
      userData: initUserData,
      fromInternalBalance: false
    }

    const poolId = await stablePool.getPoolId();
    await vault.joinPool(poolId, signer.address, signer.address, joinPoolRequest);
    return stablePool;
  }

}
