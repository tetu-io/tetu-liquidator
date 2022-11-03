// SPDX-License-Identifier: MIT

pragma solidity 0.8.4;

interface ITetuLiquidator {

  struct PoolData {
    address pool;
    address swapper;
    address tokenIn;
    address tokenOut;
  }

  function getPrice(address tokenIn, address tokenOut, uint amount) external view returns (uint);

  function getPriceForRoute(PoolData[] memory route, uint amount) external view returns (uint);

  function isRouteExist(address tokenIn, address tokenOut) external view returns (bool);

  function buildRoute(
    address tokenIn,
    address tokenOut
  ) external view returns (PoolData[] memory route, string memory errorMessage);

  function liquidate(
    address tokenIn,
    address tokenOut,
    uint amount,
    uint priceImpactTolerance
  ) external;

  function liquidateWithRoute(
    PoolData[] memory route,
    uint amount,
    uint priceImpactTolerance
  ) external;

  /// @return priceOut Estimated amount of {tokenOut} after swap
  /// @return priceImpactOut Estimated price impact percent, decimals 5
  function getPriceWithImpact(
    address tokenIn,
    address tokenOut,
    uint amount
  ) external view returns (
    uint priceOut,
    uint priceImpactOut
  );
}
