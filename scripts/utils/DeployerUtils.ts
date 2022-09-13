import {ethers, web3} from "hardhat";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {BigNumber, ContractFactory, utils} from "ethers";
import {Misc} from "./Misc";
import logSettings from "../../log_settings";
import {Logger} from "tslog";
import {Libraries} from "hardhat-deploy/dist/types";
import {parseEther, parseUnits} from "ethers/lib/utils";
import {
  Authorizer,
  BalancerWeightedPoolSwapper__factory,
  Controller,
  DystFactory,
  DystopiaSwapper,
  DystopiaSwapper__factory,
  MockToken,
  ProxyControlled,
  TetuLiquidator__factory,
  Uni2Swapper__factory,
  UniswapV2Factory, Vault, Vault__factory, WeightedPool
} from "../../typechain";
import {VerifyUtils} from "./VerifyUtils";
import {RunHelper} from "./RunHelper";

// tslint:disable-next-line:no-var-requires
const hre = require("hardhat");
const log: Logger = new Logger(logSettings);


const libraries = new Map<string, string>([
  ['VeTetu', 'VeTetuLogo']
]);

export class DeployerUtils {

  // ************ CONTRACT DEPLOY **************************

  public static async deployContract<T extends ContractFactory>(
    signer: SignerWithAddress,
    name: string,
    // tslint:disable-next-line:no-any
    ...args: any[]
  ) {
    log.info(`Deploying ${name}`);
    log.info("Account balance: " + utils.formatUnits(await signer.getBalance(), 18));

    const gasPrice = await web3.eth.getGasPrice();
    log.info("Gas price: " + gasPrice);
    const lib: string | undefined = libraries.get(name);
    let _factory;
    if (lib) {
      log.info('DEPLOY LIBRARY', lib, 'for', name);
      const libAddress = (await DeployerUtils.deployContract(signer, lib)).address;
      const librariesObj: Libraries = {};
      librariesObj[lib] = libAddress;
      _factory = (await ethers.getContractFactory(
        name,
        {
          signer,
          libraries: librariesObj
        }
      )) as T;
    } else {
      _factory = (await ethers.getContractFactory(
        name,
        signer
      )) as T;
    }
    let gas = 8_000_000;
    if (hre.network.name === 'hardhat') {
      gas = 999_999_999;
    }
    const instance = await _factory.deploy(...args, {gasLimit: gas});
    log.info('Deploy tx:', instance.deployTransaction.hash);
    await instance.deployed();

    const receipt = await ethers.provider.getTransactionReceipt(instance.deployTransaction.hash);
    console.log('DEPLOYED: ', name, receipt.contractAddress);

    if (hre.network.name !== 'hardhat') {
      await Misc.wait(10);
      if (args.length === 0) {
        await VerifyUtils.verify(receipt.contractAddress);
      } else {
        await VerifyUtils.verifyWithArgs(receipt.contractAddress, args);
        if (name === 'ProxyControlled') {
          await VerifyUtils.verifyProxy(receipt.contractAddress);
        }
      }
    }
    return _factory.attach(receipt.contractAddress);
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

  public static async deployUniswap(signer: SignerWithAddress) {
    const factory = await DeployerUtils.deployContract(signer, 'UniswapV2Factory', signer.address) as UniswapV2Factory;
    const netToken = (await DeployerUtils.deployMockToken(signer, 'WETH')).address.toLowerCase();
    return {
      factory,
      netToken
    }
  }

  public static async deployDystopia(signer: SignerWithAddress) {
    const factory = await DeployerUtils.deployContract(signer, 'DystFactory', signer.address) as DystFactory;
    const netToken = (await DeployerUtils.deployMockToken(signer, 'WETH')).address.toLowerCase();
    return {
      factory,
      netToken
    }
  }

  public static pauseWindowDuration = BigNumber.from(90 * 24 * 3600);
  public static bufferPeriodDuration = BigNumber.from(30 * 24 * 3600);

  public static async deployBalancer(signer: SignerWithAddress) {
    const authorizer = await DeployerUtils.deployContract(signer, 'Authorizer', signer.address) as Authorizer;

    const netToken = await DeployerUtils.deployMockToken(signer, 'WMATIC');

    const vault = await DeployerUtils.deployContract(signer, 'Vault',
      authorizer.address,
      netToken.address,
      DeployerUtils.pauseWindowDuration,
      DeployerUtils.bufferPeriodDuration
    ) as Vault;

    return {
      authorizer,
      vault,
      netToken,
    }
  }

  public static async deployAndInitBalancerWeightedPool(
    signer: SignerWithAddress,
    vaultAddress: string,
    tokens: MockToken[],
    normalizedWeights: BigNumber[],
    initialBalances: BigNumber[],
  ) {

    const weightedPoolParams = [
      vaultAddress,
      'Balancer Weighted Pool',
      'B-WEIGHTED',
      tokens.map(t => t.address),
      normalizedWeights,
      tokens.map(() => ethers.constants.AddressZero),
      parseEther('0.0025'),
      DeployerUtils.pauseWindowDuration,
      DeployerUtils.bufferPeriodDuration,
      signer.address
    ]
    const weightedPool = await DeployerUtils.deployContract(signer, 'WeightedPool',
      ...weightedPoolParams) as WeightedPool;

    const vault = await Vault__factory.connect(vaultAddress, signer);

    for (let i = 0; i < tokens.length; i++) {
      await tokens[i].approve(vaultAddress, initialBalances[i])
    }

    const JOIN_KIND_INIT = 0
    const initUserData = ethers.utils.defaultAbiCoder.encode(
      ["uint256", "uint256[]"],
      [JOIN_KIND_INIT, initialBalances]
    )
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

}
