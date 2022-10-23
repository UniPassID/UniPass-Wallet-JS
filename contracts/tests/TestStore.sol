//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";

contract Greeter {
    uint256 x;
    function test1(uint256 input) public returns (uint256 gasUsed) {
        uint256 gas = gasleft();
        x = input;
        gasUsed = gasleft() - gas;
    }
}
