// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract Election {

    address public owner;
    uint256 public maxVotes;
    uint256 public totalVotes;
    uint256 public electionEndTime;

    string[] public electors;
    
    mapping(address => bool) public userVotes;
    mapping(uint256 => uint256) public numberOfVotes;

    error AlreadyVoted();
    error InvalidCandidate();
    error MaxVotesReached();
    error OwnerCannotVote();
    error VotingOver();
    error NotOwner();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier electionOngoing() {
        if (block.timestamp >= electionEndTime) revert VotingOver();
        _;
    }

    constructor(string[] memory _electors, uint256 _maxVotes, uint256 _electionTime) {
        maxVotes = _maxVotes;
        electors = _electors;
        owner = msg.sender;
        electionEndTime = block.timestamp + _electionTime;
    }

    function vote(uint256 _number) public electionOngoing {
        if (userVotes[msg.sender]) revert AlreadyVoted();
        if (_number >= electors.length) revert InvalidCandidate();
        if (totalVotes >= maxVotes) revert MaxVotesReached();
        if (msg.sender == owner) revert OwnerCannotVote();

        userVotes[msg.sender] = true;
        numberOfVotes[_number] += 1;
        totalVotes += 1;
    } 

    function stopVote() public onlyOwner {
        electionEndTime = block.timestamp;
    }

    function resetMaxVotes(uint256 _newMaxVotes) public onlyOwner {
        maxVotes = _newMaxVotes;
    }

    function getVotes(uint256 _number) public view returns (uint256) {
        require(_number < electors.length, "Invalid candidate index.");
        return numberOfVotes[_number];
    }
}
