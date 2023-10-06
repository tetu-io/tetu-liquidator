// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

import "../openzeppelin/SafeERC20.sol";
import "../openzeppelin/Strings.sol";
import "../interfaces/IERC20.sol";
import "../interfaces/ISwapper.sol";
import "../interfaces/ICurveMinter.sol";
import "../interfaces/ICurveLpToken.sol";
import "../proxy/ControllableV3.sol";

/// @title Implement basic functionality for Swap tokens via Curve Pools
/// @author vpomo
abstract contract CurveSwapperBase is ControllableV3, ISwapper {
  using SafeERC20 for IERC20;

  // *************************************************************
  //                        CONSTANTS
  // *************************************************************

  /// @dev Version of this contract. Adjust manually on each code modification.
  uint public constant PRICE_IMPACT_DENOMINATOR = 100_000;

  uint public constant COINS_LENGTH_MAX = 5;
  uint private constant _LIMIT = 1;

  // *************************************************************
  //                        VARIABLES
  // *************************************************************


  // *************************************************************
  //                        EVENTS
  // *************************************************************

  event Swap(
    address pool,
    address tokenIn,
    address tokenOut,
    address recipient,
    uint priceImpactTolerance,
    uint amountIn,
    uint amountOut
  );
  // *************************************************************
  //                        INIT
  // *************************************************************

  /// @dev Proxy initialization. Call it after contract deploy.
  function init(address controller_) external initializer {
    __Controllable_init(controller_);
  }

  // *************************************************************
  //                        PRICE
  // *************************************************************

  function getPrice(
    address pool,
    address tokenIn,
    address tokenOut,
    uint amount
  ) public view override returns (uint) {
    (uint tokenInIndex, uint tokenOutIndex) = getTokensIndex(pool, tokenIn, tokenOut);
    return _callGetDY(pool, tokenInIndex, tokenOutIndex, amount);
  }

  // *************************************************************
  //                        SWAP
  // *************************************************************

  /// @dev Swap given tokenIn for tokenOut. Assume that tokenIn already sent to this contract.
  /// @param pool Curve pool
  /// @param tokenIn Token for sell
  /// @param tokenOut Token for buy
  /// @param recipient Recipient for tokenOut
  /// @param priceImpactTolerance Price impact tolerance. Must include fees at least.
  function swap(
    address pool,
    address tokenIn,
    address tokenOut,
    address recipient,
    uint priceImpactTolerance
  ) external override {
    (uint tokenInIndex, uint tokenOutIndex) = getTokensIndex(pool, tokenIn, tokenOut);
    uint amountIn = IERC20(tokenIn).balanceOf(address(this));
    require(amountIn > 0, 'Wrong amountIn');
    _approveIfNeeded(tokenIn, amountIn, pool);

    uint priceBefore = _callGetDY(pool, tokenInIndex, tokenOutIndex, amountIn);
    _callExchange(pool, tokenInIndex, tokenOutIndex, amountIn, _LIMIT);
    uint priceAfter = _callGetDY(pool, tokenInIndex, tokenOutIndex, amountIn);
    _checkPriceImpact(priceBefore, priceAfter, priceImpactTolerance);

    uint amountOut = IERC20(tokenOut).balanceOf(address(this));
    IERC20(tokenOut).safeTransfer(recipient, amountOut);

    emit Swap(
      pool,
      tokenIn,
      tokenOut,
      recipient,
      priceImpactTolerance,
      amountIn,
      amountOut
    );
  }

  function getTokensIndex(address pool, address tokenIn, address tokenOut) public view returns (uint tokenInIndex, uint tokenOutIndex) {

    address[] memory tokens = _getTokensFromPool(pool);
    uint len = tokens.length;

    tokenInIndex = type(uint).max;
    tokenOutIndex = type(uint).max;

    for (uint i = 0; i < len; i = _uncheckedInc(i)) {
      if (address(tokens[i]) == tokenIn) {
        tokenInIndex = i;
        break;
      }
    }

    for (uint i = 0; i < len; i = _uncheckedInc(i)) {
      if (address(tokens[i]) == tokenOut) {
        tokenOutIndex = i;
        break;
      }
    }

    require(tokenInIndex < len, 'Wrong tokenIn');
    require(tokenOutIndex < len, 'Wrong tokenOut');
  }

  // *************************************************************
  //                        internal functions
  // *************************************************************

  function _callGetDY(address pool, uint tokenInIndex, uint tokenOutIndex, uint dx) internal virtual view returns (uint dy);

  function _callExchange(address pool, uint tokenInIndex, uint tokenOutIndex, uint dx, uint minDy) internal virtual returns (uint amountOut);

  function _checkPriceImpact(uint priceBefore, uint priceAfter, uint priceImpactTolerance) internal pure {
    uint priceImpact;
    if (priceBefore > priceAfter) {
      priceImpact = (priceBefore - priceAfter) * PRICE_IMPACT_DENOMINATOR / priceBefore;
    } else {
      priceImpact = (priceAfter - priceBefore) * PRICE_IMPACT_DENOMINATOR / priceAfter;
    }

    require(priceImpact < priceImpactTolerance, string(abi.encodePacked("!PRICE ", Strings.toString(priceImpact))));
  }

  function _getTokensFromPool(address pool) internal view returns(address[] memory) {
    address[] memory tempTokens = new address[](COINS_LENGTH_MAX);
    uint count = 0;
    for (uint i = 0; i < COINS_LENGTH_MAX; i = _uncheckedInc(i)) {
      address coin = _getCoin(pool, i);
      if (coin == address(0)) {
        break;
      }
      tempTokens[i] = coin;
      count = _uncheckedInc(count);
    }

    address[] memory foundTokens = new address[](count);
    for (uint j = 0; j < count; j = _uncheckedInc(j)) {
      foundTokens[j] = tempTokens[j];
    }

    return foundTokens;
  }

  function _getCoin(address minter, uint index) internal view returns (address) {
    try ICurveMinter(minter).coins(index) returns (address coin) {
      return coin;
    } catch {}
    return address(0);
  }

  function _approveIfNeeded(address token, uint amount, address spender) internal {
    if (IERC20(token).allowance(address(this), spender) < amount) {
      IERC20(token).safeApprove(spender, 0);
      // infinite approve, 2*255 is more gas efficient then type(uint).max
      IERC20(token).safeApprove(spender, 2 ** 255);
    }
  }

  function _uncheckedInc(uint i) internal pure returns (uint) {
    unchecked {
      return i + 1;
    }
  }
}
