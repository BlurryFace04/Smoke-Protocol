// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

interface INFTCollateralVault {
  function depositOP(uint256 amount) external;
}

contract NFTAuction is AccessControl {

  struct ListedNFT {
    address nftContract;
    uint256 tokenId;
    uint256 price;
  }

  mapping(address => mapping(uint256 => uint256)) public nftPrices; // Mapping from NFT contract to token ID to price
  ListedNFT[] public listedNfts; // Array of listed NFTs

  bytes32 public constant NFT_MANAGER_ROLE = keccak256("NFT_MANAGER_ROLE");
  INFTCollateralVault public vaultContract;

  IERC20 public opToken; // OP token contract

  constructor(address admin, address _opTokenAddress) {
    opToken = IERC20(_opTokenAddress);
    _setupRole(DEFAULT_ADMIN_ROLE, admin);
    _setupRole(NFT_MANAGER_ROLE, admin);
  }

  // Set the address of the NFTCollateralVault contract
  function setVaultAddress(address account) external {
    require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Caller is not an admin");
    vaultContract = INFTCollateralVault(account);
  }

  // Assign NFT_MANAGER_ROLE to an address
  function assignNFTManagerRole(address account) public {
    require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Caller is not an admin");
    grantRole(NFT_MANAGER_ROLE, account);
  }

  // List an NFT for sale
  function listNFTForSale(address nftContract, uint256 tokenId, uint256 price) external {
    require(hasRole(NFT_MANAGER_ROLE, msg.sender), "Caller does not have NFT_MANAGER_ROLE");
    IERC721(nftContract).transferFrom(msg.sender, address(this), tokenId);
    nftPrices[nftContract][tokenId] = price;
    listedNfts.push(ListedNFT(nftContract, tokenId, price));
  }

  // Buy an NFT
  function buyNFT(address nftContract, uint256 tokenId) external {
    uint256 price = nftPrices[nftContract][tokenId];
    require(opToken.transferFrom(msg.sender, address(this), price), "Payment transfer failed");
    
    // Transfer the NFT to the buyer
    IERC721(nftContract).transferFrom(address(this), msg.sender, tokenId);

    // Clear the listing
    for (uint256 i = 0; i < listedNfts.length; i++) {
      if (listedNfts[i].nftContract == nftContract && listedNfts[i].tokenId == tokenId) {
        listedNfts[i] = listedNfts[listedNfts.length - 1];
        listedNfts.pop();
        break;
      }
    }
    delete nftPrices[nftContract][tokenId];

    // Send funds to the liquidity pool
    require(opToken.approve(address(vaultContract), price), "Approval for liquidity pool transfer failed");
    vaultContract.depositOP(price);
  }
}
