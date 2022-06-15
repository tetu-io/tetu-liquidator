// SPDX-License-Identifier: MIT

pragma solidity 0.8.4;

import "./openzeppelin/ReentrancyGuard.sol";
import "./openzeppelin/SafeERC20.sol";
import "./interfaces/IERC20.sol";
import "./interfaces/IERC20Metadata.sol";
import "./interfaces/ISwapper.sol";
import "./proxy/ControllableV3.sol";

/// @title Contract for determinate trade routes on-chain and sell any token for any token.
/// @author belbix
contract TetuLiquidator is ReentrancyGuard, ControllableV3 {
  using SafeERC20 for IERC20;

  // move to interface
  struct PoolData {
    address pool;
    address swapper;
    address tokenIn;
    address tokenOut;
  }

  // *************************************************************
  //                        CONSTANTS
  // *************************************************************

  /// @dev Version of this contract. Adjust manually on each code modification.
  string public constant LIQUIDATOR_VERSION = "1.0.0";
  uint public constant ROUTE_LENGTH_MAX = 5;


  // *************************************************************
  //                        VARIABLES
  //                Keep names and ordering!
  //                 Add only in the bottom.
  // *************************************************************

  /// @dev Liquidity Pools with the highest TVL for given token
  mapping(address => PoolData) public largestPools;
  /// @dev Liquidity Pools with the most popular tokens
  mapping(address => mapping(address => PoolData)) public blueChipsPools;
  /// @dev Hold blue chips tokens addresses
  mapping(address => bool) public blueChipsTokens;

  // *************************************************************
  //                        EVENTS
  // *************************************************************

  event Liquidated(address indexed tokenIn, address indexed tokenOut, uint amount);
  event PoolAdded(PoolData poolData);
  event BlueChipAdded(PoolData poolData);

  // *************************************************************
  //                        INIT
  // *************************************************************

  /// @dev Proxy initialization. Call it after contract deploy.
  function init(address controller_) external initializer {
    __Controllable_init(controller_);
  }

  function _onlyOperator() internal view {
    require(IController(controller()).isOperator(msg.sender), "DENIED");
  }

  // *************************************************************
  //                   OPERATOR ACTIONS
  // *************************************************************

  /// @dev Add pools with largest TVL
  function addLargestPools(PoolData[] memory _pools, bool rewrite) external {
    _onlyOperator();

    for (uint i = 0; i < _pools.length; i++) {
      PoolData memory pool = _pools[i];
      require(largestPools[pool.tokenIn].pool == address(0) || rewrite, "L: Exist");
      largestPools[pool.tokenIn] = pool;

      emit PoolAdded(pool);
    }
  }

  /// @dev Add largest pools with the most popular tokens on the current network
  function addBlueChipsPools(PoolData[] memory _pools, bool rewrite) external {
    _onlyOperator();

    for (uint i = 0; i < _pools.length; i++) {
      PoolData memory pool = _pools[i];
      require(blueChipsPools[pool.tokenIn][pool.tokenOut].pool == address(0) || rewrite, "L: Exist");
      // not necessary to check the reversed

      blueChipsPools[pool.tokenIn][pool.tokenOut] = pool;
      blueChipsPools[pool.tokenOut][pool.tokenIn] = pool;
      blueChipsTokens[pool.tokenIn] = true;
      blueChipsTokens[pool.tokenOut] = true;

      emit BlueChipAdded(pool);
    }
  }

  // *************************************************************
  //                        LIQUIDATE
  // *************************************************************

  function liquidate(
    address tokenIn,
    address tokenOut,
    uint amount,
    uint slippage
  ) external {

    (PoolData[] memory route, uint routeLength, string memory errorMessage) = buildRoute(tokenIn, tokenOut);
    if (routeLength == 0) {
      revert(errorMessage);
    }

    for (uint i; i < routeLength; i++) {
      PoolData memory data = route[i];

      // if it is the first step send tokens to the swapper from the current contract
      if (i == 0) {
        IERC20(tokenIn).safeTransferFrom(msg.sender, data.swapper, amount);
      }
      address recipient;
      // if it is not the last step of the route send to the next swapper
      if (i != routeLength - 1) {
        recipient = route[i + 1].swapper;
      } else {
        // if it is the last step need to send to the sender
        recipient = msg.sender;
      }

      ISwapper(data.swapper).swap(data.pool, data.tokenIn, data.tokenOut, recipient, slippage);
    }

    emit Liquidated(tokenIn, tokenOut, amount);
  }

  // *************************************************************
  //                        ROUTE
  // *************************************************************

  /// @dev Check possibility liquidate tokenIn for tokenOut.
  function isRouteExist(address tokenIn, address tokenOut) external view returns (bool) {
    (, uint length,) = buildRoute(tokenIn, tokenOut);
    return length != 0;
  }

  /// @dev Build route for liquidation. No reverts inside.
  /// @return route Array of pools for liquidate tokenIn to tokenOut.
  ///               Can have higher size than length. Ignore elements higher than `routeLength`.
  /// @return routeLength Size of the route. Zero value indicates that the route was not found.
  /// @return errorMessage Possible reason why the route was not found. Empty for success routes.
  function buildRoute(
    address tokenIn,
    address tokenOut
  ) public view returns (PoolData[] memory route, uint routeLength, string memory errorMessage)  {
    route = new PoolData[](ROUTE_LENGTH_MAX);

    // --- BLUE CHIPS for in/out

    // in case that we try to liquidate blue chips use bc lps directly
    PoolData memory poolDataBC = blueChipsPools[tokenIn][tokenOut];
    if (poolDataBC.pool != address(0)) {
      poolDataBC.tokenIn = tokenIn;
      poolDataBC.tokenOut = tokenOut;
      route[0] = poolDataBC;
      return (route, 1, "");
    }

    // --- POOL for in

    // find the best Pool for token IN
    PoolData memory poolDataIn = largestPools[tokenIn];
    if (poolDataIn.pool == address(0)) {
      return (route, 0, "L: Not found pool for tokenIn");
    }

    route[0] = poolDataIn;
    // if the best Pool for token IN a pair with token OUT token we complete the route
    if (poolDataIn.tokenOut == tokenOut) {
      return (route, 1, "");
    }

    // --- BC for POOL_in

    // if we able to swap opposite token to a blue chip it is the cheaper way to liquidate
    poolDataBC = blueChipsPools[poolDataIn.tokenOut][tokenOut];
    if (poolDataBC.pool != address(0)) {
      poolDataBC.tokenIn = poolDataIn.tokenOut;
      poolDataBC.tokenOut = tokenOut;
      route[1] = poolDataBC;
      return (route, 2, "");
    }

    // --- POOL for out

    // find the largest pool for token out
    PoolData memory poolDataOut = largestPools[tokenOut];

    if (poolDataOut.pool == address(0)) {
      return (route, 0, "L: Not found pool for tokenOut");
    }

    // need to swap directions for tokenOut pool
    (poolDataOut.tokenIn, poolDataOut.tokenOut) = (poolDataOut.tokenOut, poolDataOut.tokenIn);

    // if the largest pool for tokenOut contains tokenIn it is the best way
    if (tokenIn == poolDataOut.tokenIn) {
      route[0] = poolDataOut;
      return (route, 1, "");
    }

    // if we can swap between largest pools the route is ended
    if (poolDataIn.tokenOut == poolDataOut.tokenIn) {
      route[1] = poolDataOut;
      return (route, 2, "");
    }

    // --- BC for POOL_out

    // if we able to swap opposite token to a blue chip it is the cheaper way to liquidate
    poolDataBC = blueChipsPools[poolDataIn.tokenOut][poolDataOut.tokenIn];
    if (poolDataBC.pool != address(0)) {
      poolDataBC.tokenIn = poolDataIn.tokenOut;
      poolDataBC.tokenOut = poolDataOut.tokenIn;
      route[1] = poolDataBC;
      route[2] = poolDataOut;
      return (route, 3, "");
    }

    // ------------------------------------------------------------------------
    //                      RECURSIVE PART
    // We don't have 1-2 pair routes. Need to find pairs for pairs.
    // This part could be build as recursion but for reduce complexity and safe gas was not.
    // ------------------------------------------------------------------------

    // --- POOL2 for in

    PoolData memory poolDataIn2 = largestPools[poolDataIn.tokenOut];
    if (poolDataIn2.pool == address(0)) {
      return (route, 0, "L: Not found pool for tokenIn2");
    }

    route[1] = poolDataIn2;
    if (poolDataIn2.tokenOut == tokenOut) {
      return (route, 2, "");
    }

    if (poolDataIn2.tokenOut == poolDataOut.tokenIn) {
      route[2] = poolDataOut;
      return (route, 3, "");
    }

    // --- BC for POOL2_in

    poolDataBC = blueChipsPools[poolDataIn2.tokenOut][tokenOut];
    if (poolDataBC.pool != address(0)) {
      poolDataBC.tokenIn = poolDataIn2.tokenOut;
      poolDataBC.tokenOut = tokenOut;
      route[2] = poolDataBC;
      return (route, 3, "");
    }

    // --- POOL2 for out

    // find the largest pool for token out
    PoolData memory poolDataOut2 = largestPools[poolDataOut.tokenIn];
    if (poolDataOut2.pool == address(0)) {
      return (route, 0, "L: Not found pool for tokenOut2");
    }

    // need to swap directions for tokenOut2 pool
    (poolDataOut2.tokenIn, poolDataOut2.tokenOut) = (poolDataOut2.tokenOut, poolDataOut2.tokenIn);

    // if we can swap between largest pools the route is ended
    if (poolDataIn.tokenOut == poolDataOut2.tokenIn) {
      route[1] = poolDataOut2;
      route[2] = poolDataOut;
      return (route, 3, "");
    }

    if (poolDataIn2.tokenOut == poolDataOut2.tokenIn) {
      route[2] = poolDataOut2;
      route[3] = poolDataOut;
      return (route, 4, "");
    }

    // --- BC for POOL2_out

    // token OUT pool can be paired with BC pool with token IN
    poolDataBC = blueChipsPools[tokenIn][poolDataOut2.tokenIn];
    if (poolDataBC.pool != address(0)) {
      poolDataBC.tokenIn = tokenIn;
      poolDataBC.tokenOut = poolDataOut2.tokenIn;
      route[0] = poolDataBC;
      route[1] = poolDataOut2;
      route[2] = poolDataOut;
      return (route, 3, "");
    }

    poolDataBC = blueChipsPools[poolDataIn.tokenOut][poolDataOut2.tokenIn];
    if (poolDataBC.pool != address(0)) {
      poolDataBC.tokenIn = poolDataIn.tokenOut;
      poolDataBC.tokenOut = poolDataOut2.tokenIn;
      route[1] = poolDataBC;
      route[2] = poolDataOut2;
      route[3] = poolDataOut;
      return (route, 4, "");
    }

    poolDataBC = blueChipsPools[poolDataIn2.tokenOut][poolDataOut2.tokenIn];
    if (poolDataBC.pool != address(0)) {
      poolDataBC.tokenIn = poolDataIn2.tokenOut;
      poolDataBC.tokenOut = poolDataOut2.tokenIn;
      route[2] = poolDataBC;
      route[3] = poolDataOut2;
      route[4] = poolDataOut;
      return (route, 5, "");
    }

    // We are not handling other cases such as:
    // - If a token has liquidity with specific token
    //   and this token also has liquidity only with specific token.
    //   This case never exist but could be implemented if requires.
    return (route, 0, "L: Liquidation path not found");
  }

}
