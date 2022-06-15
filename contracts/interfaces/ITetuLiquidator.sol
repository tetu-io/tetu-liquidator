// SPDX-License-Identifier: MIT

pragma solidity 0.8.4;

interface ITetuLiquidator {

  struct PoolData {
    address pool;
    address swapper;
    address tokenIn;
    address tokenOut;
  }

  function liquidate(
    address tokenIn,
    address tokenOut,
    uint amount,
    uint slippage
  ) external;

  function liquidateWithRoute(
    PoolData[] memory route,
    uint routeLength,
    uint amount,
    uint slippage
  ) external;

  function isRouteExist(address tokenIn, address tokenOut) external view returns (bool);

  function buildRoute(
    address tokenIn,
    address tokenOut
  ) external view returns (PoolData[] memory route, uint routeLength, string memory errorMessage);

}
