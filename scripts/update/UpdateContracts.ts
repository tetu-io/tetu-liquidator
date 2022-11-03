import {ethers, network} from "hardhat";
import {appendFileSync} from "fs";
import {DeployerUtils} from "../utils/DeployerUtils";
import {Misc} from "../utils/Misc";
import {
  Controller__factory,
  ITetuLiquidator,
  ITetuLiquidator__factory
} from "../../typechain";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {RunHelper} from "../utils/RunHelper";
import {parseUnits} from "ethers/lib/utils";
import {BigNumber} from "ethers";

interface IAppContractsSet {
  tetuLiquidator?: string;
  uni2Swapper?: string;
  dystopiaSwapper?: string;
  balancerStablePoolSwapper?: string;
  balancerWeightedPoolSwapper?: string;
}

async function deployLogic(
  signer: SignerWithAddress,
  contractName: string | undefined,
  destPathTxt: string,
  chainId: number
) : Promise<string | undefined> {
  if (!contractName) {
    return undefined;
  }
  const logic = await DeployerUtils.deployContract(signer, contractName);
  console.log(`Updated (and verified): ${contractName}, new logic address=${logic.address}`);

  appendFileSync(destPathTxt, '\n-----------\n', 'utf8');
  appendFileSync(destPathTxt, `Network: ${chainId} ${network.name}\n`, 'utf8');
  appendFileSync(destPathTxt,
    `Updated and verified: ${contractName}, new logic address=${logic.address}`,
    'utf8',
  );

  return logic.address;
}

function prepareProxiesAndLogicsArrays(
  setProxies: IAppContractsSet,
  setLogics: IAppContractsSet
) : {proxies: string[], logics: string[]} {
  const proxies: string[] = [];
  const logics: string[] = [];
  if (setProxies.tetuLiquidator && setLogics.tetuLiquidator) {
    proxies.push(setProxies.tetuLiquidator);
    logics.push(setLogics.tetuLiquidator);
  }
  if (setProxies.uni2Swapper && setLogics.uni2Swapper) {
    proxies.push(setProxies.uni2Swapper);
    logics.push(setLogics.uni2Swapper);
  }
  if (setProxies.dystopiaSwapper && setLogics.dystopiaSwapper) {
    proxies.push(setProxies.dystopiaSwapper);
    logics.push(setLogics.dystopiaSwapper);
  }
  if (setProxies.balancerStablePoolSwapper && setLogics.balancerStablePoolSwapper) {
    proxies.push(setProxies.balancerStablePoolSwapper);
    logics.push(setLogics.balancerStablePoolSwapper);
  }
  if (setProxies.balancerWeightedPoolSwapper && setLogics.balancerWeightedPoolSwapper) {
    proxies.push(setProxies.balancerWeightedPoolSwapper);
    logics.push(setLogics.balancerWeightedPoolSwapper);
  }
  return {proxies, logics};
}

async function testCallsPriceWithImpact(signer: SignerWithAddress, proxySet: IAppContractsSet) {
  // let's ensure, that updated TetuLiquidator works fine
  const tetuLiquidator: ITetuLiquidator = ITetuLiquidator__factory.connect(
    proxySet.tetuLiquidator || "",
    signer
  );
  const DAI = "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063";
  const USDC = "0x2791bca1f2de4661ed88a30c99a7a9449aa84174";
  const USDT = "0xc2132d05d31c914a87c6611c10748aeb04b58e8f";
  const BALANCER = "0x9a71012B13CA4d3D0Cdc72A177DF3ef03b0E76A3";
  const WBTC = "0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6";
  const WETH = "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619";
  const WMATIC = "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270";
  const SUSHI = "0x0b3F868E0BE5597D5DB7fEB59E1CADBb0fdDa50a";
  const CRV = "0x172370d5Cd63279eFa6d502DAB29171933a610AF";
  const assets = [DAI, USDC, USDT, BALANCER, WBTC, WETH, WMATIC, SUSHI, CRV];
  const prices: {
    priceOut: BigNumber;
    maxPriceImpactOut: BigNumber
  }[] = [];
  for (let i = 0; i < assets.length; ++i) {
    for (let j = i + 1; j < assets.length; ++j) {
      prices.push(
        await tetuLiquidator.getPriceWithImpact(assets[i], assets[j], parseUnits("1"))
      );
    }
  }
  console.log(prices);

}

/**
 * Update implementations of given contracts.
 *
 * Run one of the following commands to run the script on stand-alone hardhat:
 *      npx hardhat run scripts/update/UpdateContracts.ts
 *      npx hardhat run --network localhost scripts/update/UpdateContracts.ts
 *
 * Addresses of the deployed contracts are saved to
 *      tmp/updated.txt
 */
async function main() {
  const destPathTxt = "tmp/updated.txt";

  // comment all contracts that you don't need to update
  const contractsToUpdateNames: IAppContractsSet = {
    tetuLiquidator: "TetuLiquidator",
    uni2Swapper: "Uni2Swapper",
    dystopiaSwapper: "DystopiaSwapper",
    balancerStablePoolSwapper: "BalancerStablePoolSwapper",
    balancerWeightedPoolSwapper: "BalancerWeightedPoolSwapper",
  };

  // Addresses of currently deployed proxies
  // See actual addresses here: https://github.com/tetu-io/tetu-liquidator
  const controllerAddress = "0x943c56c23992b16b3d95b0c481d8fb7727e31ea8";
  const contractProxyAddresses: IAppContractsSet = {
    tetuLiquidator: "0xC737eaB847Ae6A92028862fE38b828db41314772",
    uni2Swapper: "0x0089539BeCB82Ab51bc5C76F93Aa61281540fF33",
    dystopiaSwapper: "0x867F88209074f4B7300e7593Cd50C05B2c02Ad01",
    balancerStablePoolSwapper: "0xc43e971566B8CCAb815C3E20b9dc66571541CeB4",
    balancerWeightedPoolSwapper: "0x0bcbE4653e96aE39bde24312882faA0EdDF03256",
  };

  // check networks and connect as a governance
  const net = await ethers.provider.getNetwork();
  console.log(net, network.name);

  const localHardhatIsInUse = network.name === "localhost" || network.name === "hardhat";
  const signer = localHardhatIsInUse
      ? await Misc.impersonate(process.env.TETU_GOVERNANCE_ACCOUNT_FOR_HARDHAT)
      : (await ethers.getSigners())[0];
  console.log("signer", signer.address);

  // Deploy new logic for each contract
  // Any contracts with empty names will be skipped
  const newLogics: IAppContractsSet = {
    tetuLiquidator: await deployLogic(signer, contractsToUpdateNames.tetuLiquidator, destPathTxt, net.chainId),
    uni2Swapper: await deployLogic(signer, contractsToUpdateNames.uni2Swapper, destPathTxt, net.chainId),
    dystopiaSwapper: await deployLogic(signer, contractsToUpdateNames.dystopiaSwapper, destPathTxt, net.chainId),
    balancerStablePoolSwapper: await deployLogic(signer, contractsToUpdateNames.balancerStablePoolSwapper, destPathTxt, net.chainId),
    balancerWeightedPoolSwapper: await deployLogic(signer, contractsToUpdateNames.balancerWeightedPoolSwapper, destPathTxt, net.chainId),
  }
  console.log("newLogics", newLogics);

  // update logic in the proxies
  const {proxies, logics} = prepareProxiesAndLogicsArrays(contractProxyAddresses, newLogics);
  console.log("proxies", proxies);
  console.log("logics", logics);

  const controller = Controller__factory.connect(controllerAddress, signer);
  await RunHelper.runAndWait(
    () => controller.updateProxies(proxies, logics, {gasLimit: 8_000_000})
  );
  console.log("Done");

  // let's try to use new function
  // await testCallsPriceWithImpact(signer, contractProxyAddresses);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
