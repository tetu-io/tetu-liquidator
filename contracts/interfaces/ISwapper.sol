// SPDX-License-Identifier: MIT

pragma solidity 0.8.4;

interface ISwapper {

  function swap(
    address pool,
    address tokenIn,
    address tokenOut,
    address recipient,
    uint priceImpactTolerance
  ) external;

  function getPrice(
    address pool,
    address tokenIn,
    address tokenOut,
    uint amount
  ) external view returns (uint);

  /// @return amountOut Estimated amount of {tokenOut} after swap
  /// @return priceImpactOut Estimated price impact percent, decimals 5
  function getPriceWithImpact(
    address pool,
    address tokenIn,
    address tokenOut,
    uint amount
  ) external view returns (
    uint amountOut,
    uint priceImpactOut
  );
}
