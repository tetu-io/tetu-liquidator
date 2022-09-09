// SPDX-License-Identifier: MIT

pragma solidity 0.8.4;

import "../openzeppelin/SafeERC20.sol";
import "../interfaces/IERC20.sol";
import "../interfaces/IERC20Metadata.sol";
import "../interfaces/ISwapper.sol";
import "../interfaces/IBVault.sol";
import "../interfaces/IBasePool.sol";
import "../proxy/ControllableV3.sol";
import "../openzeppelin/Math.sol";

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
  ) public override returns (uint) {

    IAsset[] memory assets = new IAsset[](2);
    assets[_ASSET_IN_INDEX] = IAsset(tokenIn);
    assets[_ASSET_OUT_INDEX] = IAsset(tokenOut);

    IBVault.BatchSwapStep memory swapStep;
    swapStep.poolId = IBasePool(pool).getPoolId();
    swapStep.assetInIndex = _ASSET_IN_INDEX;
    swapStep.assetOutIndex = _ASSET_OUT_INDEX;
    swapStep.amount = amount;
    IBVault.BatchSwapStep[] memory swaps = new IBVault.BatchSwapStep[](1);
    swaps[0] = swapStep;

    IBVault.FundManagement memory funds;
    funds.sender = address(this);
    funds.fromInternalBalance = false;
    funds.recipient = payable(address(this));
    funds.toInternalBalance = false;

    // In order to accurately 'simulate' swaps, this function actually does perform the swaps, including calling the
    // Pool hooks and updating balances in storage. However, once it computes the final Vault Deltas, it
    // reverts unconditionally, returning this array as the revert data.
    // Read more: https://github.com/balancer-labs/balancer-v2-monorepo/blob/cf6576db6cab7a7aa731d74dcdff1c4babb9a935/pkg/vault/contracts/Swaps.sol#L446

    int256[] memory returned = IBVault(balancerVault).queryBatchSwap(
      IBVault.SwapKind.GIVEN_IN,
      swaps,
      assets,
      funds
    );
    return uint(returned[_ASSET_OUT_INDEX]);
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
    singleSwap.poolId = IBasePool(pool).getPoolId();
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
