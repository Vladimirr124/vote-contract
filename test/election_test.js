const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Election contract", function () {
  let Election;
  let election;
  let owner;
  let addr1;
  let addr2;
  let addr3;
  let electors;
  let maxVotes;
  let electionTime;

  beforeEach(async function () {
    [owner, addr1, addr2, addr3, ...addrs] = await ethers.getSigners();

    electors = ["Alice", "Bob", "Charlie"];
    maxVotes = 2;
    electionTime = 3600; // 1 hour in seconds

    Election = await ethers.getContractFactory("Election");
    election = await Election.deploy(electors, maxVotes, electionTime);
    await election.waitForDeployment();

  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await election.owner()).to.equal(owner.address);
    });

    it("Should set maxVotes correctly", async function () {
      expect(await election.maxVotes()).to.equal(maxVotes);
    });

    it("Should set electors correctly", async function () {
      expect(await election.electors(0)).to.equal("Alice");
      expect(await election.electors(1)).to.equal("Bob");
      expect(await election.electors(2)).to.equal("Charlie");
    });

    it("Should set electionEndTime in the future", async function () {
      const blockTimestamp = (await ethers.provider.getBlock("latest")).timestamp;
      const endTime = await election.electionEndTime();
      expect(endTime).to.be.above(blockTimestamp);
    });
  });

  describe("Voting", function () {
    it("Should allow a valid vote", async function () {
      await election.connect(addr1).vote(0);
      expect(await election.userVotes(addr1.address)).to.equal(true);
      expect(await election.numberOfVotes(0)).to.equal(1);
      expect(await election.totalVotes()).to.equal(1);
    });

    it("Should not allow voting twice by same address", async function () {
      await election.connect(addr1).vote(1);
      await expect(election.connect(addr1).vote(1)).to.be.revertedWithCustomError(election, "AlreadyVoted");
    });

    it("Should not allow voting for invalid candidate", async function () {
      await expect(election.connect(addr1).vote(5)).to.be.revertedWithCustomError(election, "InvalidCandidate");
    });

    it("Should not allow owner to vote", async function () {
      await expect(election.connect(owner).vote(0)).to.be.revertedWithCustomError(election, "OwnerCannotVote");
    });

    it("Should not allow voting after maxVotes reached", async function () {
      await election.connect(addr1).vote(0);
      await election.connect(addr2).vote(1);

      // maxVotes = 2, now totalVotes == maxVotes, next vote must fail
      await expect(election.connect(addr3).vote(2)).to.be.revertedWithCustomError(election, "MaxVotesReached");
    });

    it("Should not allow voting after election time ended", async function () {
      // Move time forward beyond electionEndTime
      await ethers.provider.send("evm_increaseTime", [electionTime + 1]);
      await ethers.provider.send("evm_mine", []);

      await expect(election.connect(addr1).vote(0)).to.be.revertedWithCustomError(election, "VotingOver");
    });
  });

  describe("Owner-only functions", function () {
    it("Should allow owner to stop voting", async function () {
      await election.connect(owner).stopVote();

      // After stopVote, electionEndTime should be <= current block time
      const currentTime = (await ethers.provider.getBlock("latest")).timestamp;
      const electionEndTime = await election.electionEndTime();
      expect(electionEndTime).to.be.lte(currentTime);

      // Now voting should fail because voting is over
      await expect(election.connect(addr1).vote(0)).to.be.revertedWithCustomError(election, "VotingOver");
    });

    it("Should not allow non-owner to stop voting", async function () {
      await expect(election.connect(addr1).stopVote()).to.be.revertedWithCustomError(election, "NotOwner");
    });

    it("Should allow owner to reset maxVotes", async function () {
      const newMaxVotes = 5;
      await election.connect(owner).resetMaxVotes(newMaxVotes);
      expect(await election.maxVotes()).to.equal(newMaxVotes);
    });

    it("Should not allow non-owner to reset maxVotes", async function () {
      await expect(election.connect(addr1).resetMaxVotes(10)).to.be.revertedWithCustomError(election, "NotOwner");
    });
  });

  describe("getVotes function", function () {
    it("Should return correct votes for a candidate", async function () {
      await election.connect(addr1).vote(0);
      await election.connect(addr2).vote(0);

      const votesForCandidate0 = await election.getVotes(0);
      expect(votesForCandidate0).to.equal(2);
    });

    it("Should revert if invalid candidate index requested", async function () {
      await expect(election.getVotes(10)).to.be.revertedWith("Invalid candidate index.");
    });
  });
});
