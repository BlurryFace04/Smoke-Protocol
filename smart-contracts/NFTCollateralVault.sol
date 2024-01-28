// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

// Interface for the Messenger contract
interface IMessenger {
  function getLastReceivedMessageDetails() external view returns (bytes32 messageId, string memory text);
}

contract NFTCollateralVault2 is AccessControl {
  bytes32 public constant NFT_MANAGER_ROLE = keccak256("NFT_MANAGER_ROLE");

  // Chainlink oracles for price feeds
  // AggregatorV3Interface internal nftFloorPriceFeed;
  AggregatorV3Interface internal ethUsdPriceFeed;
  AggregatorV3Interface internal opUsdPriceFeed;

  IERC20 public opToken;

  uint256 constant LOAN_TO_VALUE_PERCENT = 80;
  uint256 constant LIQUIDATION_BORROW_PERCENT = 80;

  struct NFT {
    address nftContract;
    uint256 tokenId;
  }

  mapping(address => NFT[]) public nftDeposits; // Mapping of depositor addresses to lists of NFTDeposit structs
  mapping(address => uint256) public borrowedAmount; // Mapping of depositor addresses to amount borrowed in ETH
  mapping(address => address) public collections; // Mapping of Whitelisted Testnet NFT Collections to corresponding data feed contracts
  mapping(address => uint256) public liquidityPool; // Mapping of liquidity providers to their supplied ETH

  // Constructor to initialize roles and price feeds
  constructor(address admin, address _opTokenAddress) {
    _setupRole(DEFAULT_ADMIN_ROLE, admin);
    _setupRole(NFT_MANAGER_ROLE, admin);

    opToken = IERC20(_opTokenAddress);

    ethUsdPriceFeed = AggregatorV3Interface(
      0x57241A37733983F97C4Ab06448F244A1E0Ca0ba8
    );

    opUsdPriceFeed = AggregatorV3Interface(
      0xfecc21FAc6943205b0a35CEeEdEb7b4173212794
    );

    // messengerContract = IMessenger(_messengerAddress);
  }

  // Function for users to deposit their NFTs as collateral
  function depositNFT(address nftContract, uint256 tokenId) external {
    require(collections[nftContract] != address(0), "NFT contract not whitelisted!");

    nftDeposits[msg.sender].push(NFT(nftContract, tokenId));
    IERC721(nftContract).transferFrom(msg.sender, address(this), tokenId);
  }

  // Function to withdraw deposited NFTs from the contract
  function withdrawNFT(address nftContract, uint256 tokenId) external {
    require(nftIsDepositedByUser(msg.sender, nftContract, tokenId), "NFT not deposited by user");
    uint256 nftValueInOp = convertNftPriceToOp(getNFTPrice(nftContract));
    uint256 loanedAmountOp = (nftValueInOp * LOAN_TO_VALUE_PERCENT) / 100;
    require(borrowPower(msg.sender) + loanedAmountOp >= borrowedAmount[msg.sender], "Insufficient BorrowPower after withdrawal");

    IERC721(nftContract).transferFrom(address(this), msg.sender, tokenId);
    removeNFTFromDeposits(msg.sender, nftContract, tokenId);
  }

  // Function to borrow OP against the NFT collateral
  function borrowOP(uint256 amount) external {
    require(amount <= borrowPower(msg.sender), "Insufficient borrow power!");
    require(opToken.balanceOf(address(this)) >= amount, "Insufficient liquidity in the pool!");
    require(opToken.transfer(msg.sender, amount), "Transfer failed");
    borrowedAmount[msg.sender] += amount;
  }

  // Function to repay borrowed OP
  function repayOP(uint256 amount) external {
    require(borrowedAmount[msg.sender] >= amount, "Cannot repay more than borrowed!");
    require(opToken.transferFrom(msg.sender, address(this), amount), "Transfer failed");
    borrowedAmount[msg.sender] -= amount;
  }

  // Function for users to deposit OP as liquidity
  function depositOP(uint256 amount) external {
    require(opToken.transferFrom(msg.sender, address(this), amount), "Transfer failed");
    liquidityPool[msg.sender] += amount;
  }

  // Function for users to withdraw OP from the liquidity pool
  function withdrawOP(uint256 amount) external {
    require(liquidityPool[msg.sender] >= amount, "Cannot withdraw more than deposited!");
    require(opToken.balanceOf(address(this)) >= amount, "Insufficient liquidity in the pool!");
    require(opToken.transfer(msg.sender, amount), "Transfer failed");

    liquidityPool[msg.sender] -= amount;
  }

  // Function to whitelist a new NFT collection and its corresponding price feed
  function whitelistCollection(address nftAddress, address messengerAddress) external {
    require(hasRole(NFT_MANAGER_ROLE, msg.sender), "Caller does not have NFT_MANAGER_ROLE");
    collections[nftAddress] = messengerAddress;
  }

  // Function to calculate the current borrow power of a user
  function borrowPower(address user) public view returns (uint256) {
    uint256 totalBorrowPower = 0;
    for (uint256 i = 0; i < nftDeposits[user].length; i++) {
      NFT storage nft = nftDeposits[user][i];
      uint256 nftValueInOp = convertNftPriceToOp(getNFTPrice(nft.nftContract));
      uint256 loanAmountOp = (nftValueInOp * LOAN_TO_VALUE_PERCENT) / 100;
      totalBorrowPower += loanAmountOp;
    }
    return totalBorrowPower;
  }

  // Internal function to check if an NFT is deposited by the user
  function nftIsDepositedByUser(address user, address nftContract, uint256 tokenId) internal view returns (bool) {
    NFT[] storage userDeposits = nftDeposits[user];
    for (uint256 i = 0; i < userDeposits.length; i++) {
      if (userDeposits[i].nftContract == nftContract && userDeposits[i].tokenId == tokenId) {
        return true;
      }
    }
    return false;
  }

  // Internal function to remove an NFT from a user's deposit list
  function removeNFTFromDeposits(address user, address nftContract, uint256 tokenId) internal {
    NFT[] storage userDeposits = nftDeposits[user];
    for (uint256 i = 0; i < userDeposits.length; i++) {
      if (userDeposits[i].nftContract == nftContract && userDeposits[i].tokenId == tokenId) {
        userDeposits[i] = userDeposits[userDeposits.length - 1];
        userDeposits.pop();
        return;
      }
    }
  }

  // Public view function to get the current NFT price
  function getNFTPrice(address nftContract) public view returns (uint256) {
    require(collections[nftContract] != address(0), "NFT contract not whitelisted!");

    IMessenger messengerContract = IMessenger(collections[nftContract]);
    (, string memory priceString) = messengerContract.getLastReceivedMessageDetails();

    // Converting the string to uint
    uint256 nftPrice = stringToUint(priceString);
    return nftPrice;
  }

  // Function to convert NFT price from ETH to OP
  function convertNftPriceToOp(uint256 nftPriceInEth) public view returns (uint256) {
    int ethUsdPrice;
    int opUsdPrice;
    (, ethUsdPrice,,,) = ethUsdPriceFeed.latestRoundData();
    (, opUsdPrice,,,) = opUsdPriceFeed.latestRoundData();
    require(ethUsdPrice > 0 && opUsdPrice > 0, "Invalid price feed data");
    uint256 nftPriceInUsd = uint256(nftPriceInEth) * uint256(ethUsdPrice) / 1e8;
    uint256 nftPriceInOp = nftPriceInUsd * 1e8 / uint256(opUsdPrice);
    return nftPriceInOp;
  }

  // Helper function to convert string to uint
  function stringToUint(string memory s) internal pure returns (uint256 result) {
    bytes memory b = bytes(s);
    uint256 i;
    result = 0;
    for (i = 0; i < b.length; i++) {
      uint8 c = uint8(b[i]);
      if (c >= 48 && c <= 57) {
        result = result * 10 + (c - 48);
      }
    }
  }

  // Function to check contract's OP balance
  function getContractBalance() public view returns (uint256) {
    return opToken.balanceOf(address(this));
  }
}
