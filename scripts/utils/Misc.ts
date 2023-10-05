import hre, {ethers} from "hardhat";
import {Logger} from "tslog";
import logSettings from "../../log_settings";
import {MaticAddresses} from "../addresses/MaticAddresses";
import {FtmAddresses} from "../addresses/FtmAddresses";
import {EthAddresses} from "../addresses/EthAddresses";

const log: Logger = new Logger(logSettings);

export class Misc {
  public static readonly SECONDS_OF_DAY = 60 * 60 * 24;
  public static readonly SECONDS_OF_YEAR = Misc.SECONDS_OF_DAY * 365;
  public static readonly ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
  public static readonly GEIST_BOR_RATIO = 0.95;
  public static readonly AAVE_BOR_RATIO = 0.99;
  public static readonly IRON_BOR_RATIO = 0.99;
  public static readonly MAX_UINT = '115792089237316195423570985008687907853269984665640564039457584007913129639935';
  public static readonly MAX_UINT_MINUS_ONE = '115792089237316195423570985008687907853269984665640564039457584007913129639934';

  public static printDuration(text: string, start: number) {
    log.info('>>>' + text, ((Date.now() - start) / 1000).toFixed(1), 'sec');
  }


  // ************** ADDRESSES **********************

  public static getController() {
    if (Misc.getNetworkName() === 'base') {
      return '0x0EFc2D2D054383462F2cD72eA2526Ef7687E1016';
    }
    throw new Error('Not implemented for ' + Misc.getNetworkName());
  }
  public static getLiquidator() {
    if (Misc.getNetworkName() === 'base') {
      return '0x22e2625F9d8c28CB4BcE944E9d64efb4388ea991';
    }
    throw new Error('Not implemented for ' + Misc.getNetworkName());
  }

  public static async impersonate(address: string | null = null) {
    if (address === null) {
      address = await Misc.getGovernance();
    }
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [address],
    });

    await hre.network.provider.request({
      method: "hardhat_setBalance",
      params: [address, "0x1431E0FAE6D7217CAA0000000"],
    });
    console.log('address impersonated', address);
    return ethers.getSigner(address);
  }

  public static async getGovernance() {
    const net = await ethers.provider.getNetwork();
    if (net.chainId === 137) {
      return MaticAddresses.GOV_ADDRESS;
    } else if (net.chainId === 250) {
      return FtmAddresses.GOV_ADDRESS;
    } else if (net.chainId === 1) {
      return EthAddresses.GOV_ADDRESS;
    } else if (net.chainId === 31337) {
      return ((await ethers.getSigners())[0]).address;
    } else {
      throw Error('No config for ' + net.chainId);
    }
  }

  public static isNetwork(id: number) {
    return hre.network.config.chainId === id;
  }

  public static getNetworkId() {
    return hre.network.config.chainId;
  }

  public static getNetworkName() {
    return hre.network.name;
  }

  public static async getStorageAt(address: string, index: string) {
    return ethers.provider.getStorageAt(address, index);
  }

  public static async setStorageAt(address: string, index: string, value: string) {
    await ethers.provider.send("hardhat_setStorageAt", [address, index, value]);
    await ethers.provider.send("evm_mine", []); // Just mines to the next block
  }

  // ****************** WAIT ******************

  public static async delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  public static async wait(blocks: number) {
    if (hre.network.name === 'hardhat') {
      return;
    }
    const start = ethers.provider.blockNumber;
    while (true) {
      log.info('wait 10sec');
      await Misc.delay(10000);
      if (ethers.provider.blockNumber >= start + blocks) {
        break;
      }
    }
  }

}
