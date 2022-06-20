import {ethers, web3} from "hardhat";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {ContractFactory, utils} from "ethers";
import {Misc} from "./Misc";
import logSettings from "../../log_settings";
import {Logger} from "tslog";
import {Libraries} from "hardhat-deploy/dist/types";
import {parseUnits} from "ethers/lib/utils";
import {
  ControllerMinimal,
  MockToken,
  ProxyControlled,
  TetuLiquidator__factory, Uni2Swapper__factory, UniswapV2Factory, UniswapV2Router02
} from "../../typechain";
import {VerifyUtils} from "./VerifyUtils";

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
    let gas = 5_000_000;
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

  public static async deployMockToken(signer: SignerWithAddress, name = 'MOCK', decimals = 18) {
    const token = await DeployerUtils.deployContract(signer, 'MockToken', name + '_MOCK_TOKEN', name, decimals) as MockToken;
    await token.mint(signer.address, parseUnits('1000000', decimals));
    return token;
  }


  public static async deployMockController(signer: SignerWithAddress) {
    return await DeployerUtils.deployContract(signer, 'ControllerMinimal', signer.address) as ControllerMinimal;
  }

  public static async deployProxy(signer: SignerWithAddress, contract: string) {
    const logic = await DeployerUtils.deployContract(signer, contract);
    const proxy = await DeployerUtils.deployContract(signer, 'ProxyControlled') as ProxyControlled;
    await proxy.initProxy(logic.address);
    return proxy.address;
  }

  public static async deployTetuLiquidator(signer: SignerWithAddress, controller: string) {
    const proxy = await DeployerUtils.deployProxy(signer, 'TetuLiquidator')
    const liq = TetuLiquidator__factory.connect(proxy, signer);
    await liq.init(controller)
    return liq;
  }

  public static async deployUni2Swapper(signer: SignerWithAddress, controller: string) {
    const proxy = await DeployerUtils.deployProxy(signer, 'Uni2Swapper')
    const swapper = Uni2Swapper__factory.connect(proxy, signer);
    await swapper.init(controller)
    return swapper;
  }

  public static async deployUniswap(signer: SignerWithAddress) {
    const factory = await DeployerUtils.deployContract(signer, 'UniswapV2Factory', signer.address) as UniswapV2Factory;
    const netToken = (await DeployerUtils.deployMockToken(signer, 'WETH')).address.toLowerCase();
    const router = await DeployerUtils.deployContract(signer, 'UniswapV2Router02', factory.address, netToken) as UniswapV2Router02;
    return {
      factory,
      netToken,
      router
    }
  }

}
