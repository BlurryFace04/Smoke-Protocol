import React, { useState } from 'react';
import { useAccount, useContractWrite } from 'wagmi';
import { ethers } from 'ethers';
import NFTCollateralVaultABI from '.././NFTCollateralVaultABI.json';
import { Button } from "@/components/ui/button";

const vaultAddress = '0xABb3872137d2D6056e9FabE8828BeeD73Ebf3771';

function Withdraw({ amount }: { amount: string }) {
  const { address } = useAccount();
  const [isWithdrawInitiated, setIsWithdrawInitiated] = useState(false);

  const handleWithdrawOP = async () => {
    if (amount && !isWithdrawInitiated) {
      const amountInWei = ethers.parseUnits(amount, 18);
      await withdrawOP({ args: [amountInWei] });
      setIsWithdrawInitiated(true);
    }
  };

  const { write: withdrawOP, isLoading } = useContractWrite({
    address: vaultAddress, 
    abi: NFTCollateralVaultABI,
    functionName: 'withdrawOP',
  });

  return (
    <Button onClick={handleWithdrawOP} disabled={isLoading || isWithdrawInitiated}>Withdraw</Button>
  );
}

export default Withdraw;
