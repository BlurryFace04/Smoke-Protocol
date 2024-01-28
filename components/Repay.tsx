import React, { useState, useEffect } from 'react';
import { useAccount, useContractWrite, useSendTransaction, useWaitForTransaction } from 'wagmi';
import { ethers } from 'ethers';
import FacilitatorContractABI from '.././NFTCollateralVaultABI.json'
import ERC20ABI from '.././ERC20ABI.json';
import { Button } from "@/components/ui/button";

const facilitatorContractAddress = '0xABb3872137d2D6056e9FabE8828BeeD73Ebf3771';
const opTokenAddress = '0x281d17B0F6a155F77D6B3b827b97a084A4B3B04A';

function Repay({ amount }: { amount: string }) {
  const { address } = useAccount();
  const [transferTxHash, setTransferTxHash] = useState<`0x${string}` | undefined>(undefined);
  const [isRepayInitiated, setIsRepayInitiated] = useState(false);

  const { write: transferGHO, isLoading: isTransferLoading } = useContractWrite({
    address: opTokenAddress, 
    abi: ERC20ABI,
    functionName: 'transfer',
    onSuccess(data) {
      setTransferTxHash(data.hash as `0x${string}`);
    },
  });

  const { data: transferTxData, isLoading: isTransferTxLoading } = useWaitForTransaction({ 
    hash: transferTxHash,
    enabled: !!transferTxHash,
  });

  const { write: repayGHO, isLoading: isRepayLoading } = useContractWrite({
    address: facilitatorContractAddress, 
    abi: FacilitatorContractABI,
    functionName: 'repayGho',
  });

  useEffect(() => {
    if (transferTxData && !isRepayInitiated) {
      const amountInWei = ethers.parseUnits(amount, 18);
      repayGHO({ args: [amountInWei] });
      setIsRepayInitiated(true);
    }
  }, [transferTxData, isRepayInitiated, repayGHO, amount]);

  const handleRepayGHO = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      console.error("Invalid amount for repayment");
      return;
    }

    const amountInWei = ethers.parseUnits(amount, 18);

    if (!isTransferLoading && !isTransferTxLoading && !isRepayInitiated) {
      await transferGHO({ args: [facilitatorContractAddress, amountInWei] })
    }
  };

  return (
    <Button onClick={handleRepayGHO} disabled={isTransferLoading || isTransferTxLoading || isRepayLoading}>Repay</Button>
  );
}

export default Repay;
