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

interface ICurveMinter {

    function fee() external view returns (uint256);

    function coins(uint256 i) external view returns (address);

    function balances(uint256 i) external view returns (uint256);

    function get_dy(uint256 i, uint256 j, uint256 dx) external view returns (uint256);

    function lp_token() external view returns (address);

    function get_virtual_price() external view returns (uint);

    function add_liquidity(uint256[] calldata amounts, uint256 min_mint_amount, bool use_underlying) external;

    function add_liquidity(uint256[] calldata amounts, uint256 min_mint_amount) external;

    function remove_liquidity_imbalance(uint256[3] calldata amounts, uint256 max_burn_amount, bool use_underlying) external;

    function remove_liquidity(uint256 _amount, uint256[3] calldata amounts, bool use_underlying) external;

    function exchange(uint256 from, uint256 to, uint256 _from_amount, uint256 _min_to_amount) external returns (uint256);

    function exchange_underlying(int128 i, int128 j, uint256 dx, uint256 min_dy) external;

    function calc_token_amount(uint256[3] calldata amounts, bool deposit) external view returns (uint);

}