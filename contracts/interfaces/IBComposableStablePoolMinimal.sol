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

interface IBComposableStablePoolMinimal {
    /**
     * @dev Returns all normalized weights, in the same order as the Pool's tokens.
     */
    function getPoolId() external view returns (bytes32);
    function getSwapFeePercentage() external view returns (uint256);
    function getAmplificationParameter() external view returns (uint256 value, bool isUpdating, uint256 precision);
    function getScalingFactors() external view returns (uint256[] memory);
    function getBptIndex() external view returns (uint256);
    function updateTokenRateCache(address token) external;
}
