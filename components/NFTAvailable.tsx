import React, { useState, useEffect } from 'react';
import { useAccount, useContractWrite, useContractRead, useWaitForTransaction } from 'wagmi';
import ERC721ABI from '.././ERC721ABI.json';
import FacilitatorContractABI from '.././NFTCollateralVaultABI.json';
import { Button } from "@/components/ui/button";

// const facilitatorContractAddress = '0x9EA2a6f7D0Ea4Af488aD6962578848e3880FA5d7';
const facilitatorContractAddress = '0xABb3872137d2D6056e9FabE8828BeeD73Ebf3771';

interface NFT {
  collectionName: string,
  name: string,
  description?: string,
  symbol?: string,
  image: string,
  contractAddress: string,
  tokenId: string,
  tokenType?: string
}

function NFTAvailable({ nft }: { nft: NFT}) {
  const { address } = useAccount();
  const [approvalTxHash, setApprovalTxHash] = useState<`0x${string}` | undefined>(undefined);
  const [isDepositInitiated, setIsDepositInitiated] = useState(false);

  const { data: isApproved, isLoading: isApprovedLoading } = useContractRead({
    address: nft.contractAddress as `0x${string}`,
    abi: ERC721ABI,
    functionName: 'isApprovedForAll',
    args: [address, facilitatorContractAddress]
  });

  const { write: approveNFT, isLoading: isApproveLoading } = useContractWrite({
    address: nft.contractAddress as `0x${string}`,
    abi: ERC721ABI,
    functionName: 'setApprovalForAll',
    args: [facilitatorContractAddress, true],
    onSuccess(data) {
      setApprovalTxHash(data.hash as `0x${string}`);
    },
  });

  const { data: approvalTxData, isLoading: isApprovalTxLoading } = useWaitForTransaction({ 
    hash: approvalTxHash,
    enabled: !!approvalTxHash,
  });

  const { write: depositNFT, isLoading: isDepositLoading } = useContractWrite({
    address: facilitatorContractAddress, 
    abi: FacilitatorContractABI,
    functionName: 'depositNFT',
    args: [nft.contractAddress, nft.tokenId]
  });

  useEffect(() => {
    if (approvalTxData && !isDepositInitiated) {
      depositNFT();
      setIsDepositInitiated(true);
    }
  }, [approvalTxData, isDepositInitiated, depositNFT]);

  const handleSupply = async () => {
    console.log("Is approved: ", isApproved);
    if (!isApproved && !isApprovalTxLoading && !isApproveLoading) {
      await approveNFT();
    } else if (isApproved && !isDepositInitiated) {
      depositNFT();
      setIsDepositInitiated(true);
    }
  };

  const isButtonDisabled = isApproveLoading || isApprovalTxLoading || isDepositLoading || isDepositInitiated;

  return (
    <Button variant='outline' onClick={handleSupply} disabled={isButtonDisabled}>Supply</Button>
  );
}

export default NFTAvailable;
