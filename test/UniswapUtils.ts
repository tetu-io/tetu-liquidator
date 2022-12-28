import {UniswapV2Factory, UniswapV3Factory} from "../typechain";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {DeployerUtils} from "../scripts/utils/DeployerUtils";

export class UniswapUtils {
  public static deadline = "1000000000000";

  public static async deployUniswapV2(signer: SignerWithAddress, netToken: string | null) {
    const factory = await DeployerUtils.deployContract(signer, 'UniswapV2Factory', signer.address) as UniswapV2Factory;
    if (netToken === null) {
      netToken = (await DeployerUtils.deployMockToken(signer, 'WETH')).address.toLowerCase();
    }
    return {
      factory,
      netToken,
    }
  }

  public static async deployUniswapV3(signer: SignerWithAddress) {
    const factory = await DeployerUtils.deployContract(signer, 'UniswapV3Factory') as UniswapV3Factory;
    const netToken = (await DeployerUtils.deployMockToken(signer, 'WETH')).address.toLowerCase();
    return {
      factory,
      netToken,
    }
  }

}
