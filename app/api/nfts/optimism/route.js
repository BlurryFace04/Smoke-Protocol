import { ethers } from 'ethers';
import ERC721ABI from '../../../.././ERC721ABI.json';
import AuctionABI from '../../../.././AuctionABI.json';

export const GET = async (req) => {  
  try {
    const provider = new ethers.JsonRpcProvider("https://goerli.optimism.io");
    const auctionContractAddress = "0x006Ac985e84FE026f594131D32ff61865D0C1D84";
    const auctionContract = new ethers.Contract(auctionContractAddress, AuctionABI, provider);

    let nftDetailsList = [];
    try {
      for (let i = 0; ; i++) {
        let nft = await auctionContract.listedNfts(i);
        // let priceInOP = nft.price.toString();
        let priceInOP = ethers.formatUnits(nft.price, 18); // Convert price from wei to OP
        priceInOP = parseFloat(priceInOP).toFixed(2);
        let nftContract = new ethers.Contract(nft.nftContract, ERC721ABI, provider);
        let tokenURI = await nftContract.tokenURI(nft.tokenId);
        let httpURI = convertIpfsUriToHttpUri(tokenURI);
        let response = await fetch(httpURI);
        let metadata = await response.json();
        
        let collectionName = metadata.name.split(' ')[0]; // Assuming first word is the collection name
        let imageHttpUri = convertIpfsUriToHttpUri(metadata.image); // Convert IPFS URI of image to HTTP URI
        
        nftDetailsList.push({
          collectionName: collectionName,
          contractAddress: nft.nftContract,
          image: imageHttpUri,
          name: metadata.name,
          tokenId: nft.tokenId.toString(),
          price: priceInOP
        });
      }
    } catch (error) {
      console.log('All NFTs fetched:', nftDetailsList);
    }

    return new Response(JSON.stringify(nftDetailsList), { status: 200 });

  } catch (error) {
    console.error('Error fetching NFT metadata:', error);
    return new Response(JSON.stringify({ error }), {
      status: 500
    });
  }
};

const convertIpfsUriToHttpUri = (ipfsUri) => {
  const ipfsGatewayPrefix = 'https://ipfs.io/ipfs/';
  return ipfsUri.replace(/^ipfs:\/\//, ipfsGatewayPrefix);
};
