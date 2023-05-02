// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

import "../openzeppelin/SafeERC20.sol";
import "../interfaces/IERC20.sol";
import "../interfaces/IERC20Metadata.sol";
import "../interfaces/ISwapper.sol";
import "../interfaces/IBVault.sol";
import "../interfaces/IBComposableStablePoolMinimal.sol";
import "../proxy/ControllableV3.sol";
import "../openzeppelin/Math.sol";
import "../lib/balancer-v2-solidity-utils/StableMath.sol";
import "../lib/ScaleLib.sol";

/// @title Swap tokens via Balancer Composable Stable Pools.
/// @author a17
contract BalancerComposableStablePoolSwapper is ControllableV3, ISwapper {
  using SafeERC20 for IERC20;
  address public balancerVault;

  // *************************************************************
  //                        CONSTANTS
  // *************************************************************

  /// @dev Version of this contract. Adjust manually on each code modification.
  string public constant BALANCER_COMPOSABLE_STABLE_POOL_SWAPPER_VERSION = "1.0.1";
  uint public constant PRICE_IMPACT_DENOMINATOR = 100_000;

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
    IBComposableStablePoolMinimal _pool = IBComposableStablePoolMinimal(pool);
    { // take pool commission
      uint swapFeePercentage = _pool.getSwapFeePercentage();
      amount -= amount * swapFeePercentage / 10**18;
    }
    bytes32 poolId = _pool.getPoolId();
    (IERC20[] memory tokens, uint[] memory balances,) = IBVault(balancerVault).getPoolTokens(poolId);

    uint tokenInIndex = type(uint).max;
    uint tokenOutIndex = type(uint).max;

    uint len = tokens.length;

    for (uint i; i < len; ++i) {
      if (address(tokens[i]) == tokenIn) {
        tokenInIndex = i;
        break;
      }
    }

    for (uint i; i < len; ++i) {
      if (address(tokens[i]) == tokenOut) {
        tokenOutIndex = i;
        break;
      }
    }

    require(tokenInIndex < len, 'Wrong tokenIn');
    require(tokenOutIndex < len, 'Wrong tokenOut');

    uint[] memory scalingFactors = _pool.getScalingFactors();
    ScaleLib._upscaleArray(balances, scalingFactors);

    uint bptIndex = _pool.getBptIndex();
    balances = _dropBptItem(balances, bptIndex);
    tokenInIndex = _skipBptIndex(tokenInIndex, bptIndex);
    tokenOutIndex = _skipBptIndex(tokenOutIndex, bptIndex);

    (uint currentAmp,,) = _pool.getAmplificationParameter();
    {
    uint invariant = StableMath._calculateInvariant(currentAmp, balances, true);
    uint upscaledAmount = ScaleLib._upscale(amount, scalingFactors[tokenInIndex]);

    uint amountOutUpscaled = StableMath._calcOutGivenIn(
      currentAmp,
      balances,
      tokenInIndex,
      tokenOutIndex,
      upscaledAmount,
      invariant
    );
    return ScaleLib._downscaleDown(amountOutUpscaled, scalingFactors[tokenOutIndex]);
    }
  }

  // *************************************************************
  //                        SWAP
  // *************************************************************

  /// @dev Swap given tokenIn for tokenOut. Assume that tokenIn already sent to this contract.
  /// @param pool Balancer Stable pool
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
    singleSwap.poolId = IBComposableStablePoolMinimal(pool).getPoolId();
    singleSwap.kind = IBVault.SwapKind.GIVEN_IN;
    singleSwap.assetIn = IAsset(address(tokenIn));
    singleSwap.assetOut = IAsset(address(tokenOut));
    singleSwap.amount = amountIn;
    singleSwap.userData = "";

    // scope for checking price impact
    uint amountOutMax;
    {
      uint minimalAmount = amountIn / 1000;
      require(minimalAmount != 0, "Too low amountIn");
      uint price = getPrice(pool, tokenIn, tokenOut, minimalAmount);
      amountOutMax = price * amountIn / minimalAmount;
    }

    IERC20(tokenIn).approve(balancerVault, amountIn);
    uint amountOut = IBVault(balancerVault).swap(singleSwap, funds, _LIMIT, block.timestamp);

    require(amountOutMax < amountOut ||
      (amountOutMax - amountOut) * PRICE_IMPACT_DENOMINATOR / amountOutMax <= priceImpactTolerance,
      "!PRICE"
    );

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

  function _dropBptItem(uint[] memory amounts, uint bptIndex) internal pure returns (uint[] memory) {
    uint len = amounts.length - 1;
    uint[] memory amountsWithoutBpt = new uint[](len);
    for (uint i; i < len; ++i) {
      amountsWithoutBpt[i] = amounts[i < bptIndex ? i : i + 1];
    }

    return amountsWithoutBpt;
  }

  function _skipBptIndex(uint index, uint bptIndex) internal pure returns (uint) {
    return index < bptIndex ? index : index - 1;
  }
}
