// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

import "../openzeppelin/SafeERC20.sol";
import "../openzeppelin/Strings.sol";
import "../interfaces/IERC20.sol";
import "../interfaces/ISwapper.sol";
import "../interfaces/ICurveMinter.sol";
import "../proxy/ControllableV3.sol";

/// @title Swap tokens via Curve Pools.
/// @author vpomo
contract CurveSwapper is ControllableV3, ISwapper {
  using SafeERC20 for IERC20;

  // *************************************************************
  //                        CONSTANTS
  // *************************************************************

  /// @dev Version of this contract. Adjust manually on each code modification.
  string public constant CURVE_SWAPPER_VERSION = "1.0.1";
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
  //                     GOV ACTIONS
  // *************************************************************

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
    uint amountIn = IERC20(tokenIn).balanceOf(address(this));

    (uint256 tokenInIndex, uint256 tokenOutIndex) = getTokensIndex(curveMinter, tokenIn, tokenOut);
    approveIfNeeded(tokenIn, amountIn, curveMinter);

    _callExchange(curveMinter, tokenInIndex, tokenOutIndex, amountIn, _LIMIT);

    uint256 fromPriceAmountOut = getPrice(pool, tokenIn, tokenOut, amountIn);
    uint256 fromBalanceAmountOut = IERC20(tokenOut).balanceOf(address(this));

    uint256 priceImpact;
    if (fromPriceAmountOut > fromBalanceAmountOut) {
      priceImpact = (fromPriceAmountOut - fromBalanceAmountOut) * PRICE_IMPACT_DENOMINATOR / fromPriceAmountOut;
    } else {
      priceImpact = (fromBalanceAmountOut - fromPriceAmountOut) * PRICE_IMPACT_DENOMINATOR / fromBalanceAmountOut;
    }
    require(priceImpact < priceImpactTolerance, string(abi.encodePacked("!PRICE ", Strings.toString(priceImpact))));

    IERC20(tokenOut).safeTransfer(recipient, fromBalanceAmountOut);

    emit Swap(
      pool,
      tokenIn,
      tokenOut,
      recipient,
      priceImpactTolerance,
      amountIn,
      balanceAmountOut
    );
  }

  // *************************************************************
  //                        private functions
  // *************************************************************

  function getTokensIndex(
    address minter,
    address tokenIn,
    address tokenOut
  ) public view returns (uint256 tokenInIndex, uint256 tokenOutIndex) {

    address[] memory tokens = _getTokensFromMinter(minter);
    uint len = tokens.length;

    tokenInIndex = type(uint).max;
    tokenOutIndex = type(uint).max;

    for (uint256 i = 0; i < len; i = uncheckedInc(i)) {
      if (address(tokens[i]) == tokenIn) {
        tokenInIndex = i;
        break;
      }
    }

    for (uint256 i = 0; i < len; i = uncheckedInc(i)) {
      if (address(tokens[i]) == tokenOut) {
        tokenOutIndex = i;
        break;
      }
    }

    require(tokenInIndex < len, 'Wrong tokenIn');
    require(tokenOutIndex < len, 'Wrong tokenOut');
  }

  function _getTokensFromMinter(address minter) private view returns(address[] memory) {
    address[] memory tempTokens = new address[](COINS_LENGTH_MAX);
    uint256 count = 0;
    for (uint256 i = 0; i < COINS_LENGTH_MAX; i = uncheckedInc(i)) {
      address coin = _getCoin(minter, i);
      if (coin == address(0)) {
        break;
      }
      tempTokens[i] = coin;
      count = uncheckedInc(count);
    }

    address[] memory foundTokens = new address[](count);
    for (uint256 j = 0; j < count; j = uncheckedInc(j)) {
      foundTokens[j] = tempTokens[j];
    }

    return foundTokens;
  }

  function _getCoin(address minter, uint256 index) private view returns (address) {
    try ICurveMinter(minter).coins{gas: 6000}(index) returns (address coin) {
      return coin;
    } catch {}
    return address(0);
  }

  function _convertToInt(uint256 number) private pure returns (int128) {
    require(number < COINS_LENGTH_MAX, "Wrong token index");
    int128[5] memory intArr = [int128(0), int128(1), int128(2), int128(3), int128(4)];
    return intArr[number];
  }

  function _getMinter(address pool) private view returns (address minter) {
    (bool success, bytes memory returnData) = address(pool).staticcall(
      abi.encodeWithSignature("minter()")
    );

    if (success) {
      minter = abi.decode(returnData,(address));
    } else {
      (bool withFuncCoins, ) = minter.staticcall(
        abi.encodeWithSignature("coins(uint256)", 0)
      );
      if(withFuncCoins) {
        minter = pool;
      } else {
        revert("This pool is not a normal curve type");
      }
    }
  }

  function _callGetDY(
    address minter, uint256 tokenInIndex, uint256 tokenOutIndex, uint256 dx
  ) private view returns (uint256 dy) {

    (bool uintSuccess, bytes memory uintReturnData) = minter.staticcall(
      abi.encodeWithSignature("get_dy(uint256,uint256,uint256)",
      tokenInIndex, tokenOutIndex, dx
      )
    );

    if (uintSuccess) {
      dy = abi.decode(uintReturnData,(uint256));
    } else {
      ( , bytes memory intReturnData) = minter.staticcall(
        abi.encodeWithSignature("get_dy(int128,int128,uint256)",
        _convertToInt(tokenInIndex), _convertToInt(tokenOutIndex), dx
        )
      );
      dy = abi.decode(intReturnData,(uint256));
    }
  }

  function _callExchange(
    address minter, uint256 tokenInIndex, uint256 tokenOutIndex, uint256 dx, uint256 minDy
  ) private returns (uint256 amountOut) {

    (bool uintSuccess, bytes memory uintReturnData) = minter.call(
      abi.encodeWithSignature("exchange(uint256,uint256,uint256,uint256)",
      tokenInIndex, tokenOutIndex, dx, minDy
      )
    );

    if (uintSuccess) {
      amountOut = abi.decode(uintReturnData,(uint256));
    } else {
      ( , bytes memory intReturnData) = minter.call(
        abi.encodeWithSignature("exchange(int128,int128,uint256,uint256)",
        _convertToInt(tokenInIndex), _convertToInt(tokenOutIndex), dx, minDy
        )
      );
      amountOut = abi.decode(intReturnData,(uint256));
    }
  }

  function approveIfNeeded(address token, uint amount, address spender) private {
    if (IERC20(token).allowance(address(this), spender) < amount) {
      IERC20(token).safeApprove(spender, 0);
      // infinite approve, 2*255 is more gas efficient then type(uint).max
      IERC20(token).safeApprove(spender, 2 ** 255);
    }
  }

  function uncheckedInc(uint i) private pure returns (uint) {
    unchecked {
      return i + 1;
    }
  }
}
