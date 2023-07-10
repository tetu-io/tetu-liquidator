// SPDX-License-Identifier: GPL-3.0-or-later
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

pragma solidity 0.8.17;
pragma experimental ABIEncoderV2;

interface IBLinearPoolMinimal {
    function getPoolId() external view returns (bytes32);
    function getSwapFeePercentage() external view returns (uint256);
    function getScalingFactors() external view returns (uint256[] memory);
    function getBptIndex() external view returns (uint256);
    function getMainIndex() external view returns (uint256);
    function getWrappedIndex() external view returns (uint256);
    function getTargets() external view returns (uint256 lowerTarget, uint256 upperTarget);
    function totalSupply() external view returns (uint256);
}
