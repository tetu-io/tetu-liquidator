# <img src="tetu_contracts.svg" alt="Tetu.io">

[![codecov](https://codecov.io/gh/tetu-io/tetu-liquidator/branch/master/graph/badge.svg?token=7BRwlLGShU)](https://codecov.io/gh/tetu-io/tetu-liquidator)

This solution is able to liquidate token to another token with strict predefined path.

## Mainnet addresses


| Name                    | Address                                                                                                                                 |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Controller              | [0x053bEc42CA1Cb2E58E27097E5EC3FDf3B7BEc767](https://etherscan.io/address/0x053bEc42CA1Cb2E58E27097E5EC3FDf3B7BEc767#readProxyContract) |
| Liquidator              | [0x90351d15F036289BE9b1fd4Cb0e2EeC63a9fF9b0](https://etherscan.io/address/0x90351d15F036289BE9b1fd4Cb0e2EeC63a9fF9b0#readProxyContract) |
| UniV2Swapper            | [0x96cee247B587c19D5570dae254d57958e92D75f0](https://etherscan.io/address/0x96cee247B587c19D5570dae254d57958e92D75f0#readProxyContract) |
| BalancerStableSwapper   | [0xa4320b575e86cFa06379B8eD8C76d9149A30F948](https://etherscan.io/address/0xa4320b575e86cFa06379B8eD8C76d9149A30F948#readProxyContract) |
| BalancerWeightedSwapper | [0x7eFC54ED20E32EA76497CB241c7E658E3B29B04B](https://etherscan.io/address/0x7eFC54ED20E32EA76497CB241c7E658E3B29B04B#readProxyContract) |
| UniV3Swapper            | [0x708137a379D2bC067F6553396AD528FF9a00f1D3](https://etherscan.io/address/0x708137a379D2bC067F6553396AD528FF9a00f1D3#readProxyContract) |

## Polygon addresses

| Name                            | Address                                                                                                                                    |
|---------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------|
| Controller                      | [0x943c56C23992b16B3D95B0C481D8fb7727e31ea8](https://polygonscan.com/address/0x943c56C23992b16B3D95B0C481D8fb7727e31ea8#readProxyContract) |
| Liquidator                      | [0xC737eaB847Ae6A92028862fE38b828db41314772](https://polygonscan.com/address/0xC737eaB847Ae6A92028862fE38b828db41314772#readProxyContract) |
| UniV2Swapper                    | [0x0089539BeCB82Ab51bc5C76F93Aa61281540fF33](https://polygonscan.com/address/0x0089539BeCB82Ab51bc5C76F93Aa61281540fF33#readProxyContract) |
| DystopiaSwapper                 | [0x867F88209074f4B7300e7593Cd50C05B2c02Ad01](https://polygonscan.com/address/0x867F88209074f4B7300e7593Cd50C05B2c02Ad01#readProxyContract) |
| BalancerStableSwapper           | [0xc43e971566B8CCAb815C3E20b9dc66571541CeB4](https://polygonscan.com/address/0xc43e971566B8CCAb815C3E20b9dc66571541CeB4#readProxyContract) |
| BalancerWeightedSwapper         | [0x0bcbE4653e96aE39bde24312882faA0EdDF03256](https://polygonscan.com/address/0x0bcbE4653e96aE39bde24312882faA0EdDF03256#readProxyContract) |
| UniV3Swapper                    | [0x7b505210a0714d2a889E41B59edc260Fa1367fFe](https://polygonscan.com/address/0x7b505210a0714d2a889E41B59edc260Fa1367fFe#readProxyContract) |
| BalancerComposableStableSwapper | [0xFae1b6961F4a24B8A02AD4B4C66de447c35bf09f](https://polygonscan.com/address/0xFae1b6961F4a24B8A02AD4B4C66de447c35bf09f#readProxyContract) |
| CurveSwapper128                 | [0xCB24fCa15e04BB66061dF3d7229929bB306ecA71](https://polygonscan.com/address/0xCB24fCa15e04BB66061dF3d7229929bB306ecA71#readProxyContract) |
| CurveSwapper256                 | [0xa22b4156bc8FB94CD4B2398aB28D7194223D54aA](https://polygonscan.com/address/0xa22b4156bc8FB94CD4B2398aB28D7194223D54aA#readProxyContract) |
| AlgebraSwapper                  | [0x1d2A0025e7782f640E34Ca5aCCB14e0Ebb96B2f8](https://polygonscan.com/address/0x1d2A0025e7782f640E34Ca5aCCB14e0Ebb96B2f8#readProxyContract) |
| KyberSwapper                    | [0xE1d65E844E41cE02e1d327336446eE6B6630526f](https://polygonscan.com/address/0xE1d65E844E41cE02e1d327336446eE6B6630526f#readProxyContract) |
| BalancerLinearSwapper           | [0xa448329A95970194567fCa4B6B1B0bbA4aC0bF66](https://polygonscan.com/address/0xa448329A95970194567fCa4B6B1B0bbA4aC0bF66#readProxyContract) |

## BSC addresses

| Name             | Address                                                                                                                                |
|------------------|----------------------------------------------------------------------------------------------------------------------------------------|
| Controller       | [0x849ecF35f711fFE183838DFdaaDFe105D4C0662a](https://bscscan.com/address/0x849ecF35f711fFE183838DFdaaDFe105D4C0662a#readProxyContract) |
| Liquidator       | [0xcE9F7173420b41678320cd4BB93517382b6D48e8](https://bscscan.com/address/0xcE9F7173420b41678320cd4BB93517382b6D48e8#readProxyContract) |
| UniV2Swapper     | [0xD37fC11dEDfaa0fc3449b2BF5eDe864Ef6AaE1E3](https://bscscan.com/address/0xD37fC11dEDfaa0fc3449b2BF5eDe864Ef6AaE1E3#readProxyContract) |
| PancakeV3Swapper | [0x5413E7AFCADCB63A30Dad567f46dd146Cc427801](https://bscscan.com/address/0x5413E7AFCADCB63A30Dad567f46dd146Cc427801#readProxyContract) |
| DystopiaSwapper  | [0xECc1B6f004d4A04017a6eDc1A02f222f4ea7cad2](https://bscscan.com/address/0xECc1B6f004d4A04017a6eDc1A02f222f4ea7cad2#readProxyContract) |

## BASE addresses

| Name         | Address                                                                                                                                |
|--------------|----------------------------------------------------------------------------------------------------------------------------------------|
| Controller   | [0x0EFc2D2D054383462F2cD72eA2526Ef7687E1016](https://basescan.org//address/0x0EFc2D2D054383462F2cD72eA2526Ef7687E1016#readProxyContract) |
| Liquidator   | [0x22e2625F9d8c28CB4BcE944E9d64efb4388ea991](https://basescan.org//address/0x22e2625F9d8c28CB4BcE944E9d64efb4388ea991#readProxyContract) |
| UniV2Swapper | [0x286c02C93f3CF48BB759A93756779A1C78bCF833](https://basescan.org//address/0x286c02C93f3CF48BB759A93756779A1C78bCF833#readProxyContract) |
| UniV3Swapper | [0x00379dD90b2A337C4652E286e4FBceadef940a21](https://basescan.org//address/0x00379dD90b2A337C4652E286e4FBceadef940a21#readProxyContract) |

## Links

Web: https://tetu.io/

Docs: https://docs.tetu.io/

Discord: https://discord.gg/DSUKVEYuax

Twitter: https://twitter.com/tetu_io
