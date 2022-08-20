// SPDX-License-Identifier: MIT

pragma solidity 0.8.4;

import "../openzeppelin/SafeERC20.sol";
import "../interfaces/IERC20.sol";
import "../interfaces/IERC20Metadata.sol";
import "../interfaces/ISwapper.sol";
import "../dex/dystopia/interfaces/IDystopiaPair.sol";
import "../proxy/ControllableV3.sol";
import "../openzeppelin/Math.sol";

/// @title Swap tokens via Dystopia contracts.
/// @author belbix
contract DystopiaSwapper is ControllableV3, ISwapper {
  using SafeERC20 for IERC20;

  // *************************************************************
  //                        CONSTANTS
  // *************************************************************

  /// @dev Version of this contract. Adjust manually on each code modification.
  string public constant DYSTOPIA_SWAPPER_VERSION = "1.0.3";
  uint public constant PRICE_IMPACT_DENOMINATOR = 100_000;

  // --- REBASE TOKENS
  address private constant _USD_PLUS_MATIC = 0x236eeC6359fb44CCe8f97E99387aa7F8cd5cdE1f;
  address private constant _USD_PLUS_BSC = 0xe80772Eaf6e2E18B651F160Bc9158b2A5caFCA65;

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
    address /*tokenOut*/,
    uint amount
  ) external view override returns (uint) {
    return IDystopiaPair(pool).getAmountOut(amount, tokenIn);
  }

  // *************************************************************
  //                        SWAP
  // *************************************************************

  /// @dev Swap given tokenIn for tokenOut. Assume that tokenIn already sent to this contract.
  /// @param pool Dystopia pool
  /// @param tokenIn Token for sell
  /// @param tokenOut Token for buy
  /// @param recipient Recipient for tokenOut
  /// @param priceImpactTolerance Price impact tolerance. Must include fees at least. Denominator is 100_000.
  function swap(
    address pool,
    address tokenIn,
    address tokenOut,
    address recipient,
    uint priceImpactTolerance
  ) external override {
    // need to sync the pair for tokens with rebase mechanic
    _syncPairIfNeeds(tokenIn, pool);
    _syncPairIfNeeds(tokenOut, pool);

    uint amountIn = IERC20(tokenIn).balanceOf(address(this));
    uint amountOut = IDystopiaPair(pool).getAmountOut(amountIn, tokenIn);

    // scope for checking price impact
    {
      uint tokenInDecimals = IERC20Metadata(tokenIn).decimals();
      uint tokenOutDecimals = IERC20Metadata(tokenOut).decimals();
      uint minimalAmount = 10 ** Math.max(
        (tokenInDecimals > tokenOutDecimals ?
      tokenInDecimals - tokenOutDecimals
      : tokenOutDecimals - tokenInDecimals)
      , 1) * 10_000;
      uint amountOutMax = IDystopiaPair(pool).getAmountOut(minimalAmount, tokenIn) * amountIn / minimalAmount;

      // it is pretty hard to calculate exact impact for stable pool
      require(amountOutMax < amountOut ||
        (amountOutMax - amountOut) * PRICE_IMPACT_DENOMINATOR / amountOutMax <= priceImpactTolerance,
        "!PRICE");
    }

    uint amount0Out;
    uint amount1Out;
    {
      (address token0,) = _sortTokens(tokenIn, tokenOut);
      (amount0Out, amount1Out) = tokenIn == token0 ? (uint(0), amountOut) : (amountOut, uint(0));

      IERC20(tokenIn).safeTransfer(pool, amountIn);
    }

    IDystopiaPair(pool).swap(
      amount0Out,
      amount1Out,
      recipient,
      new bytes(0)
    );

    emit Swap(
      pool,
      tokenIn,
      tokenOut,
      recipient,
      priceImpactTolerance,
      amountIn,
      amount0Out == 0 ? amount1Out : amount0Out
    );
  }

  function _syncPairIfNeeds(address token, address pool) internal {
    if (token == _USD_PLUS_MATIC || token == _USD_PLUS_BSC) {
      IDystopiaPair(pool).sync();
    }
  }

  /// @dev Returns sorted token addresses, used to handle return values from pairs sorted in this order
  function _sortTokens(
    address tokenA,
    address tokenB
  ) internal pure returns (address token0, address token1) {
    (token0, token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
  }

}
