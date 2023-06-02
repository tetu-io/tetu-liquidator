// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

import "../interfaces/ICurveMinter.sol";
import "./CurveSwapperBase.sol";

/// @title Swap tokens via Curve Pools.
/// @author vpomo
contract CurveSwapper128 is CurveSwapperBase {

  /// @dev Version of this contract. Adjust manually on each code modification.
  string public constant CURVE_SWAPPER_128_VERSION = "1.0.0";


  function _callGetDY(
    address minter, uint256 tokenInIndex, uint256 tokenOutIndex, uint256 dx
  ) internal override view returns (uint256 dy) {
    return ICurveMinter(minter).get_dy(
      _convertToInt(tokenInIndex), _convertToInt(tokenOutIndex), dx
    );
  }

  function _callExchange(
    address minter, uint256 tokenInIndex, uint256 tokenOutIndex, uint256 dx, uint256 minDy
  ) internal override returns (uint256 amountOut) {
    return ICurveMinter(minter).exchange(
      _convertToInt(tokenInIndex), _convertToInt(tokenOutIndex), dx, minDy
    );
  }

  function _convertToInt(uint256 number) internal pure returns (int128) {
    require(number < COINS_LENGTH_MAX, "Wrong token index");
    int128[5] memory intArr = [int128(0), int128(1), int128(2), int128(3), int128(4)];
    return intArr[number];
  }
}
