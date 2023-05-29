// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

import "../openzeppelin/SafeERC20.sol";
import "../interfaces/IERC20.sol";
import "../interfaces/ISwapper.sol";
import "../interfaces/ICurveMinter.sol";
import "../proxy/ControllableV3.sol";

/// @title Swap tokens via Curve Pools.
/// @author vpomo
contract CurveSwapper is ControllableV3, ISwapper {
  using SafeERC20 for IERC20;
  address public balancerVault;

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
    address minter,
    address tokenIn,
    address tokenOut,
    uint amount
  ) public view override returns (uint) {
    (uint256 tokenInIndex, uint256 tokenOutIndex) = getTokensIndex(minter, tokenIn, tokenOut);

    return ICurveMinter(minter).get_dy(tokenInIndex, tokenOutIndex, amount);
  }

  function getTokensIndex(
    address minter,
    address tokenIn,
    address tokenOut
  ) public view returns (uint256 tokenInIndex, uint256 tokenOutIndex) {

    address[] memory tokens = getTokensFromMinter(minter);
    uint len = tokens.length;

    tokenInIndex = type(uint).max;
    tokenOutIndex = type(uint).max;

    for (uint256 i = 0; i < len; i++) {
      if (address(tokens[i]) == tokenIn) {
        tokenInIndex = i;
        break;
      }
    }

    for (uint256 i = 0; i < len; i++) {
      if (address(tokens[i]) == tokenOut) {
        tokenOutIndex = i;
        break;
      }
    }

    require(tokenInIndex < len, 'Wrong tokenIn');
    require(tokenOutIndex < len, 'Wrong tokenOut');
  }

  function getTokensFromMinter(address minter) private returns(address[] memory) {
    address memory tempTokens = new address(COINS_LENGTH_MAX);
    uint256 count = 0;
    for (uint256 i = 0; i < COINS_LENGTH_MAX; i++) {
      address coin = getCoin(ICurveMinter(minter), i);
      if (coin == address(0)) {
        break;
      }
      tempTokens[i] = coin;
      count++;
    }

    address memory foundTokens = new address(count);
    for (uint256 j = 0; j < count; j++) {
      foundTokens[j] = tempTokens[j];
    }

    return foundTokens;
  }

  function getCoin(ICurveMinter minter, uint256 index) private view returns (address) {
    try minter.coins{gas: 6000}(index) returns (address coin) {
      return coin;
    } catch {}
    return address(0);
  }

  // *************************************************************
  //                        SWAP
  // *************************************************************

  /// @dev Swap given tokenIn for tokenOut. Assume that tokenIn already sent to this contract.
  /// @param minter Curve minter
  /// @param tokenIn Token for sell
  /// @param tokenOut Token for buy
  /// @param recipient Recipient for tokenOut
  /// @param priceImpactTolerance Price impact tolerance. Must include fees at least.
  function swap(
    address minter,
    address tokenIn,
    address tokenOut,
    address recipient,
    uint priceImpactTolerance
  ) external override {

    ICurveMinter curveMinter = ICurveMinter(minter);

    uint amountIn = IERC20(tokenIn).balanceOf(address(this));

    (uint256 tokenInIndex, uint256 tokenOutIndex) = getTokensIndex(minter, tokenIn, tokenOut);

    // scope for checking price impact
    uint amountOutMax;
    {
      uint minimalAmount = amountIn / 1000;
      require(minimalAmount != 0, "Too low amountIn");
      uint price = getPrice(pool, tokenIn, tokenOut, minimalAmount);
      amountOutMax = price * amountIn / minimalAmount;
    }

    IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
    require(IERC20(tokenIn).balanceOf(address(this)) >= amountIn,
      "Wrong amountIn"
    );
    IERC20(tokenIn).approve(minter, amountIn);

    uint amountOut = curveMinter.exchange(tokenInIndex, tokenOutIndex, amountIn, _LIMIT);
    require(IERC20(tokenOut).balanceOf(address(this)) >= amountOut,
      "Wrong amountIn"
    );

    require(amountOutMax < amountOut ||
      (amountOutMax - amountOut) * PRICE_IMPACT_DENOMINATOR / amountOutMax <= priceImpactTolerance,
      "!PRICE"
    );

    IERC20(tokenOut).transfer(recipient, amountOut);

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
}
