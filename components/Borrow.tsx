import React, { useState } from 'react';
import { useAccount, useContractWrite } from 'wagmi';
import { ethers } from 'ethers';
import FacilitatorContractABI from '.././NFTCollateralVaultABI.json'
import { Button } from "@/components/ui/button";

const facilitatorContractAddress = '0xABb3872137d2D6056e9FabE8828BeeD73Ebf3771';

function Borrow({ amount }: { amount: string }) {
  const { address } = useAccount();
  const [isBorrowInitiated, setIsBorrowInitiated] = useState(false);

  const handleBorrowGHO = async () => {
    if (amount && !isBorrowInitiated) {
      const amountInWei = ethers.parseUnits(amount, 18);
      await borrowGHO({ args: [amountInWei] });
      setIsBorrowInitiated(true);
    }
  };

  const { write: borrowGHO, isLoading } = useContractWrite({
    address: facilitatorContractAddress, 
    abi: FacilitatorContractABI,
    functionName: 'borrowOP',
  });

  return (
    <Button onClick={handleBorrowGHO} disabled={isLoading || isBorrowInitiated}>Borrow</Button>
  );
}

export default Borrow;
