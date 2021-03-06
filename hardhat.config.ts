import {config as dotEnvConfig} from "dotenv";
import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-web3";
import "@nomiclabs/hardhat-solhint";
// import '@openzeppelin/hardhat-upgrades';
import "@typechain/hardhat";
// import "hardhat-docgen";
import "hardhat-contract-sizer";
import "hardhat-gas-reporter";
import "hardhat-tracer";
// import "hardhat-etherscan-abi";
import "solidity-coverage"
import "hardhat-abi-exporter"

dotEnvConfig();
// tslint:disable-next-line:no-var-requires
const argv = require('yargs/yargs')()
  .env('TETU')
  .options({
    hardhatChainId: {
      type: "number",
      default: 31337
    },
    maticRpcUrl: {
      type: "string",
    },
    ftmRpcUrl: {
      type: "string",
    },
    ethRpcUrl: {
      type: "string",
      default: ''
    },
    arbtestRpcUrl: {
      type: "string",
      default: ''
    },
    networkScanKey: {
      type: "string",
    },
    networkScanKeyMatic: {
      type: "string",
    },
    networkScanKeyFtm: {
      type: "string",
    },
    privateKey: {
      type: "string",
      default: "85bb5fa78d5c4ed1fde856e9d0d1fe19973d7a79ce9ed6c0358ee06a4550504e" // random account
    },
    ethForkBlock: {
      type: "number",
      default: 14628000
    },
    maticForkBlock: {
      type: "number",
      default: 28058008
    },
    ftmForkBlock: {
      type: "number",
      default: 35202770
    },
    fujiRpcUrl: {
      type: "string",
      default: 'https://api.avax-test.network/ext/bc/C/rpc'
    },
    avaxRpcUrl: {
    avaxRpcUrl: {
      type: "string",
      default: 'https://api.avax.network/ext/bc/C/rpc'
    },
  }).argv;


export default {
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true,
      chainId: argv.hardhatChainId,
      timeout: 99999999,
      blockGasLimit: 0x1fffffffffffff,
      gas: argv.hardhatChainId === 1 ? 19_000_000 :
        argv.hardhatChainId === 137 ? 19_000_000 :
          argv.hardhatChainId === 250 ? 11_000_000 :
            9_000_000,
      forking: argv.hardhatChainId !== 31337 ? {
        url:
          argv.hardhatChainId === 1 ? argv.ethRpcUrl :
            argv.hardhatChainId === 137 ? argv.maticRpcUrl :
              argv.hardhatChainId === 250 ? argv.ftmRpcUrl :
                argv.hardhatChainId === 421611 ? argv.arbtestRpcUrl :
                  argv.hardhatChainId === 43113 ? argv.fujiRpcUrl :
                    undefined,
        blockNumber:
          argv.hardhatChainId === 1 ? argv.ethForkBlock !== 0 ? argv.ethForkBlock : undefined :
            argv.hardhatChainId === 137 ? argv.maticForkBlock !== 0 ? argv.maticForkBlock : undefined :
              argv.hardhatChainId === 250 ? argv.ftmForkBlock !== 0 ? argv.ftmForkBlock : undefined :
                undefined
      } : undefined,
      accounts: {
        mnemonic: "test test test test test test test test test test test junk",
        path: "m/44'/60'/0'/0",
        accountsBalance: "100000000000000000000000000000"
      },
      loggingEnabled: true
    },
    ftm: {
      url: argv.ftmRpcUrl || '',
      timeout: 99999,
      chainId: 250,
      gas: 10_000_000,
      // gasPrice: 100_000_000_000,
      // gasMultiplier: 2,
      accounts: [argv.privateKey],
    },
    matic: {
      url: argv.maticRpcUrl || '',
      timeout: 99999,
      chainId: 137,
      gas: 12_000_000,
      // gasPrice: 50_000_000_000,
      // gasMultiplier: 1.3,
      accounts: [argv.privateKey],
    },
    eth: {
      url: argv.ethRpcUrl || '',
      chainId: 1,
      accounts: [argv.privateKey],
    },
    arbtest: {
      url: argv.arbtestRpcUrl || '',
      chainId: 421611,
      // gas: 50_000_000_000,
      accounts: [argv.privateKey],
    },
    fuji: {
      url: argv.fujiRpcUrl || '',
      chainId: 43113,
      gasLimit: 10_000_000,
      accounts: [argv.privateKey],
    },
    avax: {
      url: argv.avaxRpcUrl || '',
      chainId: 43114,
      // gas: 50_000_000_000,
      accounts: [argv.privateKey],
    },
  },
  etherscan: {
    //  https://hardhat.org/plugins/nomiclabs-hardhat-etherscan.html#multiple-api-keys-and-alternative-block-explorers
    apiKey: {
      mainnet: argv.networkScanKey,
      polygon: argv.networkScanKeyMatic || argv.networkScanKey,
      opera: argv.networkScanKeyFtm || argv.networkScanKey,
      arbitrumTestnet: argv.networkScanKeyArbitrum || argv.networkScanKey,
      avalancheFujiTestnet: argv.networkScanKeyAvalanche || argv.networkScanKey
    },
  },
  solidity: {
    compilers: [
      {
        version: "0.8.4",
        settings: {
          optimizer: {
            enabled: true,
            runs: 150,
          }
        }
      },
    ]
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  mocha: {
    timeout: 9999999999
  },
  docgen: {
    path: './docs',
    clear: true,
    runOnCompile: false,
    except: ['contracts/third_party', 'contracts/test']
  },
  contractSizer: {
    alphaSort: false,
    runOnCompile: false,
    disambiguatePaths: false,
  },
  gasReporter: {
    enabled: false,
    currency: 'USD',
    gasPrice: 21
  },
  typechain: {
    outDir: "typechain",
  },
  abiExporter: {
    path: './artifacts/abi',
    runOnCompile: false,
    spacing: 2,
    pretty: false,
  }
};
