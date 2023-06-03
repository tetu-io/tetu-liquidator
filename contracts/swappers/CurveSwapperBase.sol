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
  //                Keep names and ordering!
  //                 Add only in the bottom.
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
    address curveMinter = _getMinter(pool);
    (uint256 tokenInIndex, uint256 tokenOutIndex) = getTokensIndex(curveMinter, tokenIn, tokenOut);

    return _callGetDY(curveMinter, tokenInIndex, tokenOutIndex, amount);
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
    address curveMinter = _getMinter(pool);
    (uint256 tokenInIndex, uint256 tokenOutIndex) = getTokensIndex(curveMinter, tokenIn, tokenOut);
    uint amountIn = IERC20(tokenIn).balanceOf(address(this));
    require(amountIn > 0, 'Wrong amountIn');
    _approveIfNeeded(tokenIn, amountIn, curveMinter);

    uint256 priceBefore = _callGetDY(curveMinter, tokenInIndex, tokenOutIndex, amountIn);
    _callExchange(curveMinter, tokenInIndex, tokenOutIndex, amountIn, _LIMIT);
    uint256 priceAfter = _callGetDY(curveMinter, tokenInIndex, tokenOutIndex, amountIn);
    _checkPriceImpact(priceBefore, priceAfter, priceImpactTolerance);

    uint256 amountOut = IERC20(tokenOut).balanceOf(address(this));
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

  function getTokensIndex(
    address minter,
    address tokenIn,
    address tokenOut
  ) public view returns (uint256 tokenInIndex, uint256 tokenOutIndex) {

    address[] memory tokens = _getTokensFromMinter(minter);
    uint len = tokens.length;

    tokenInIndex = type(uint).max;
    tokenOutIndex = type(uint).max;

    for (uint256 i = 0; i < len; i = _uncheckedInc(i)) {
      if (address(tokens[i]) == tokenIn) {
        tokenInIndex = i;
        break;
      }
    }

    for (uint256 i = 0; i < len; i = _uncheckedInc(i)) {
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

  function _callGetDY(
    address minter, uint256 tokenInIndex, uint256 tokenOutIndex, uint256 dx
  ) internal virtual view returns (uint256 dy) {}

  function _callExchange(
    address minter, uint256 tokenInIndex, uint256 tokenOutIndex, uint256 dx, uint256 minDy
  ) internal virtual returns (uint256 amountOut) {}

  function _checkPriceImpact(uint256 priceBefore, uint256 priceAfter, uint256 priceImpactTolerance) internal pure {
    uint256 priceImpact;
    if (priceBefore > priceAfter) {
      priceImpact = (priceBefore - priceAfter) * PRICE_IMPACT_DENOMINATOR / priceBefore;
    } else {
      priceImpact = (priceAfter - priceBefore) * PRICE_IMPACT_DENOMINATOR / priceAfter;
    }

    require(priceImpact < priceImpactTolerance, string(abi.encodePacked("!PRICE ", Strings.toString(priceImpact))));
  }

  function _getTokensFromMinter(address minter) internal view returns(address[] memory) {
    address[] memory tempTokens = new address[](COINS_LENGTH_MAX);
    uint256 count = 0;
    for (uint256 i = 0; i < COINS_LENGTH_MAX; i = _uncheckedInc(i)) {
      address coin = _getCoin(minter, i);
      if (coin == address(0)) {
        break;
      }
      tempTokens[i] = coin;
      count = _uncheckedInc(count);
    }

    address[] memory foundTokens = new address[](count);
    for (uint256 j = 0; j < count; j = _uncheckedInc(j)) {
      foundTokens[j] = tempTokens[j];
    }

    return foundTokens;
  }

  function _getCoin(address minter, uint256 index) internal view returns (address) {
    try ICurveMinter(minter).coins{gas: 6000}(index) returns (address coin) {
      return coin;
    } catch {}
    return address(0);
  }

  function _getMinter(address pool) internal view returns (address minter) {
    try ICurveLpToken(pool).minter{gas: 30000}() returns (address result){
      minter = result;
    } catch {
      try ICurveMinter(pool).coins{gas: 30000}(0) returns (address){
        minter = pool;
      } catch {
        revert("This pool is not a normal curve type");
      }
    }
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
