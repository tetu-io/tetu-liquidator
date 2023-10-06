// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

import "../interfaces/ICurveMinter.sol";
import "./CurveSwapperBase.sol";

/// @title Swap tokens via Curve Pools.
/// @author vpomo
contract CurveSwapper256 is CurveSwapperBase {

  /// @dev Version of this contract. Adjust manually on each code modification.
  string public constant CURVE_SWAPPER_256_VERSION = "1.0.1";


  function _callGetDY(
    address pool,
    uint tokenInIndex,
    uint tokenOutIndex,
    uint dx
  ) internal override view returns (uint dy) {
    return ICurveMinter(pool).get_dy(tokenInIndex, tokenOutIndex, dx);
  }

  function _callExchange(
    address pool, 
    uint tokenInIndex, 
    uint tokenOutIndex, 
    uint dx, 
    uint minDy
  ) internal override returns (uint amountOut) {
    return ICurveMinter(pool).exchange(tokenInIndex, tokenOutIndex, dx, minDy);
  }
}
