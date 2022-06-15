// SPDX-License-Identifier: MIT

pragma solidity 0.8.4;

import "../interfaces/IProxyControlled.sol";
import "../interfaces/IController.sol";

contract ControllerMinimal is IController {

  address public override governance;
  mapping(address => bool) public operators;

  constructor (address governance_) {
    governance = governance_;
    operators[governance_] = true;
  }

  function updateProxies(address[] memory proxies, address[] memory newLogics) external {
    require(proxies.length == newLogics.length, "Wrong arrays");
    for (uint i; i < proxies.length; i++) {
      IProxyControlled(proxies[i]).upgrade(newLogics[i]);
    }
  }

  function isOperator(address _adr) external view override returns (bool) {
    return operators[_adr];
  }

}
