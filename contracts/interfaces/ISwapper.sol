// SPDX-License-Identifier: MIT

pragma solidity 0.8.4;

interface ISwapper {

  function swap(
    address pool,
    address tokenIn,
    address tokenOut,
    address recipient,
    uint slippage
  ) external;

}
