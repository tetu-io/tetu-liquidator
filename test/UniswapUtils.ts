import {IUniswapV2Pair__factory, UniswapV2Factory} from "../typechain";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {DeployerUtils} from "../scripts/utils/DeployerUtils";
import {BigNumber, BigNumberish, Signer} from "ethers";
import {parseUnits} from "ethers/lib/utils";

export class UniswapUtils {
  public static deadline = "1000000000000";

  public static async deployUniswap(signer: SignerWithAddress) {
    const factory = await DeployerUtils.deployContract(signer, 'UniswapV2Factory', signer.address) as UniswapV2Factory;
    const netToken = (await DeployerUtils.deployMockToken(signer, 'WETH')).address.toLowerCase();
    return {
      factory,
      netToken,
    }
  }

  public static async getMaxAmountOut(
    signer: SignerWithAddress,
    pair: string,
    tokenIn: string,
    amountToSwap: BigNumber
  ) : Promise<BigNumber> {
    const {reserve0, reserve1} = await IUniswapV2Pair__factory.connect(pair, signer).getReserves();
    const token0 = await IUniswapV2Pair__factory.connect(pair, signer).token0();
    const reserveIn = token0 === tokenIn ? reserve0 : reserve1;
    const reserveOut = token0 === tokenIn ? reserve1 : reserve0;
    const n18 = parseUnits('1');
    return amountToSwap.mul(n18).div(reserveIn.mul(n18).div(reserveOut));
  }

}
