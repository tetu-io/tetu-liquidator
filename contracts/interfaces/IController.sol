// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

interface IController {

  function governance() external view returns (address);

  function isOperator(address _adr) external view returns (bool);


}
