// SPDX-License-Identifier: MIT

pragma solidity 0.8.4;

import "../openzeppelin/SafeERC20.sol";
import "../interfaces/IERC20.sol";
import "../interfaces/IERC20Metadata.sol";
import "../interfaces/ISwapper.sol";
import "../interfaces/IBVault.sol";
import "../interfaces/IWeightedPool.sol";
import "../proxy/ControllableV3.sol";
import "../openzeppelin/Math.sol";
import "../lib/WeightedMath.sol";

/// @title Swap tokens via Balancer vault.
/// @author bogdoslav
contract BalancerSwapper is ControllableV3, ISwapper {
  using SafeERC20 for IERC20;
  address public balancerVault;

  // *************************************************************
  //                        CONSTANTS
  // *************************************************************

  /// @dev Version of this contract. Adjust manually on each code modification.
  string public constant BASLANCER_SWAPPER_VERSION = "1.0.0";
  uint public constant PRICE_IMPACT_DENOMINATOR = 100_000;

  uint private constant _ASSET_IN_INDEX = 0;
  uint private constant _ASSET_OUT_INDEX = 1;
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
  function init(address controller_, address balancerVault_) external initializer {
    __Controllable_init(controller_);
    require(balancerVault_ != address(0), 'Zero balancerVault');
    balancerVault = balancerVault_;
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

    bytes32 poolId = IWeightedPool(pool).getPoolId();
    (IERC20[] memory tokens,
    uint256[] memory balances,) = IBVault(balancerVault).getPoolTokens(poolId);
    require(tokens.length == 2, 'Wrong pool tokens length');
    require(
      (tokens[0] == IERC20(tokenIn) && tokens[1] == IERC20(tokenOut)) ||
      (tokens[1] == IERC20(tokenIn) && tokens[0] == IERC20(tokenOut)),
      'Wrong pool tokens'
    );
    uint256[] memory weights = IWeightedPool(pool).getNormalizedWeights();
    require(weights.length == 2, 'Wrong pool weights length');

    bool direct = tokens[0] == IERC20(tokenIn);

    (uint weightIn, uint weightOut) = direct ?
      (weights[0], weights[1]) : (weights[1], weights[0]);

    (uint balanceIn, uint balanceOut) = direct ?
      (balances[0], balances[1]) : (balances[1], balances[0]);

    return WeightedMath._calcOutGivenIn(
      balanceIn,
      weightIn,
      balanceOut,
      weightOut,
      amount
    );
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

    uint amountIn = IERC20(tokenIn).balanceOf(address(this));

    // Initializing each struct field one-by-one uses less gas than setting all at once.
    IBVault.FundManagement memory funds;
    funds.sender = address(this);
    funds.fromInternalBalance = false;
    funds.recipient = payable(recipient);
    funds.toInternalBalance = false;

    // Initializing each struct field one-by-one uses less gas than setting all at once.
    IBVault.SingleSwap memory singleSwap;
    singleSwap.poolId = IWeightedPool(pool).getPoolId();
    singleSwap.kind = IBVault.SwapKind.GIVEN_IN;
    singleSwap.assetIn = IAsset(address(tokenIn));
    singleSwap.assetOut = IAsset(address(tokenOut));
    singleSwap.amount = amountIn;
    singleSwap.userData = "";

    IERC20(tokenIn).approve(balancerVault, amountIn);
    uint amountOut = IBVault(balancerVault).swap(singleSwap, funds, _LIMIT, block.timestamp);

    // scope for checking price impact
    {
      uint tokenInDecimals = IERC20Metadata(tokenIn).decimals();
      uint tokenOutDecimals = IERC20Metadata(tokenOut).decimals();
      uint minimalAmount = 10 ** Math.max(
        (tokenInDecimals > tokenOutDecimals
      ? tokenInDecimals - tokenOutDecimals
      : tokenOutDecimals - tokenInDecimals
        )
      , 1) * 10_000;
      uint amountOutMax = getPrice(pool, tokenIn, tokenOut, minimalAmount) * amountIn / minimalAmount;

      // it is pretty hard to calculate exact impact for Balancer pools
      require(amountOutMax < amountOut ||
        (amountOutMax - amountOut) * PRICE_IMPACT_DENOMINATOR / amountOutMax <= priceImpactTolerance,
        "!PRICE");
    }

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
