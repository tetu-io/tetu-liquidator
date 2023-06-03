// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

import "../interfaces/ICurveMinter.sol";
import "./CurveSwapperBase.sol";

/// @title Swap tokens via Curve Pools.
/// @author vpomo
contract CurveSwapper256 is CurveSwapperBase {

  /// @dev Version of this contract. Adjust manually on each code modification.
  string public constant CURVE_SWAPPER_256_VERSION = "1.0.0";


  function _callGetDY(
    address minter, uint256 tokenInIndex, uint256 tokenOutIndex, uint256 dx
  ) internal override view returns (uint256 dy) {
    return ICurveMinter(minter).get_dy(
      tokenInIndex, tokenOutIndex, dx
    );
  }

  function _callExchange(
    address minter, uint256 tokenInIndex, uint256 tokenOutIndex, uint256 dx, uint256 minDy
  ) internal override returns (uint256 amountOut) {
    return ICurveMinter(minter).exchange(
      tokenInIndex, tokenOutIndex, dx, minDy
    );
  }
}
