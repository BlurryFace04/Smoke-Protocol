import React, { useState } from 'react';
import { useAccount, useContractWrite } from 'wagmi';
import { ethers } from 'ethers';
import NFTCollateralVaultABI from '.././NFTCollateralVaultABI.json';
import { Button } from "@/components/ui/button";

const vaultAddress = '0xABb3872137d2D6056e9FabE8828BeeD73Ebf3771';

function Supply({ amount }: { amount: string }) {
  const { address } = useAccount();
  const [isSupplyInitiated, setIsSupplyInitiated] = useState(false);

  const handleSupplyOP = async () => {
    if (amount && !isSupplyInitiated) {
      const amountInWei = ethers.parseUnits(amount, 18);
      await supplyOP({ args: [amountInWei] });
      setIsSupplyInitiated(true);
    }
  };

  const { write: supplyOP, isLoading } = useContractWrite({
    address: vaultAddress, 
    abi: NFTCollateralVaultABI,
    functionName: 'depositOP',
  });

  return (
    <Button onClick={handleSupplyOP} disabled={isLoading || isSupplyInitiated}>Supply</Button>
  );
}

export default Supply;
