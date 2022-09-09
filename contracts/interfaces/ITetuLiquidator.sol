// SPDX-License-Identifier: MIT

pragma solidity 0.8.4;

interface ITetuLiquidator {

  struct PoolData {
    address pool;
    address swapper;
    address tokenIn;
    address tokenOut;
  }

  // Why is the price functions is not view? Read here:
  // https://github.com/balancer-labs/balancer-v2-monorepo/blob/cf6576db6cab7a7aa731d74dcdff1c4babb9a935/pkg/vault/contracts/Swaps.sol#L446
  // I just commented /*view*/ keyword, but not removed it to see, what functions designed as view

  function getPrice(address tokenIn, address tokenOut, uint amount) external /*view*/ returns (uint);

  function getPriceForRoute(PoolData[] memory route, uint amount) external /*view*/ returns (uint);

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


}
