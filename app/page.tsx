'use client'

import * as React from 'react'
import { useState, useEffect } from 'react';
import { useAccount, useContractWrite, useContractRead, useWaitForTransaction } from 'wagmi'
import { ethers } from 'ethers';
import Image from 'next/image'
import NFTAvailable from '@/components/NFTAvailable'
import NFTDeposited from '@/components/NFTDeposited'
import Borrow from '@/components/Borrow'
import Repay from '@/components/Repay'
import Supply from '@/components/Supply';
import Withdraw from '@/components/Withdraw';
import FacilitatorContractABI from '.././NFTCollateralVaultABI.json'
import NFTCollateralVaultABI from '.././NFTCollateralVaultABI.json'
import ERC20ABI from '.././ERC20ABI.json'

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious
} from "@/components/ui/carousel";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"

interface NFT {
  collectionName: string,
  name: string,
  description?: string,
  symbol?: string,
  image: string,
  contractAddress: string,
  tokenId: string,
  tokenType?: string
  price?: string
}

const facilitatorContractAddress = '0xABb3872137d2D6056e9FabE8828BeeD73Ebf3771';
const opTokenAddress = '0x281d17B0F6a155F77D6B3b827b97a084A4B3B04A';
const vaultAddress = '0xABb3872137d2D6056e9FabE8828BeeD73Ebf3771';

interface GroupedNFTs {
  [collectionName: string]: NFT[];
}

const filterUserNFTs = (allNFTs: NFT[], userNFTs: any[]) => {
  console.log("Filtering user NFTs: ", allNFTs, userNFTs)
  return allNFTs.filter(nft => 
    userNFTs.some(userNft => 
      userNft && nft && 
      userNft.nftContract?.toLowerCase() === nft.contractAddress?.toLowerCase() &&
      userNft.tokenId === nft.tokenId
    )
  );
};

function Page() {
  const { address } = useAccount();
  const [NFTs, setNFTs] = useState<NFT[]>([]);
  const [groupedNFTs, setGroupedNFTs] = useState<GroupedNFTs>({});
  const [auctionNFTs, setAuctionNFTs] = useState<NFT[]>([]);
  const [groupedAuctionNFTs, setGroupedAuctionNFTs] = useState<GroupedNFTs>({});
  const [groupedDepositedNFTs, setGroupedDepositedNFTs] = useState<GroupedNFTs>({});
  const [loadingNFTs, setLoadingNFTs] = useState(true);
  const [depositIndex, setDepositIndex] = useState(0);
  const [depositedNFTs, setDepositedNFTs] = useState<any[]>([]);
  const [borrowAmount, setBorrowAmount] = useState('');
  const [repayAmount, setRepayAmount] = useState('');
  const [supplyAmount, setSupplyAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');

  const depositReadResult = useContractRead({
    address: facilitatorContractAddress,
    abi: FacilitatorContractABI,
    functionName: 'nftDeposits',
    args: [address, depositIndex]
  });

  const borrowedAmountRead = useContractRead({
    address: facilitatorContractAddress,
    abi: FacilitatorContractABI,
    functionName: 'borrowedAmount',
    args: [address],
  });

  const borrowPowerRead = useContractRead({
    address: facilitatorContractAddress,
    abi: FacilitatorContractABI,
    functionName: 'borrowPower',
    args: [address],
  });

  const opBalance = useContractRead({
    address: opTokenAddress,
    abi: ERC20ABI,
    functionName: 'balanceOf',
    args: [address],
  });

  const opSupplied = useContractRead({
    address: vaultAddress,
    abi: NFTCollateralVaultABI,
    functionName: 'liquidityPool',
    args: [address],
  });

  console.log("Borrowed amount read: ", borrowedAmountRead.data);
  console.log("Borrow power read: ", borrowPowerRead.data);

  const opBalanceFormatted = opBalance.data 
    ? parseFloat(ethers.formatUnits(opBalance.data.toString(), 18)).toFixed(2)
    : '0.00';

  const opSuppliedFormatted = opSupplied.data 
    ? parseFloat(ethers.formatUnits(opSupplied.data.toString(), 18)).toFixed(2)
    : '0.00';

  const borrowedAmountFormatted = borrowedAmountRead.data
    ? parseFloat(ethers.formatUnits(borrowedAmountRead.data.toString(), 18)).toFixed(2)
    : '0.00';

  // const borrowPowerFormatted = borrowPowerRead.data 
  //   ? parseFloat(ethers.formatUnits(borrowPowerRead.data.toString(), 18)).toFixed(2)
  //   : '0.00';

  const borrowPowerFormatted = borrowPowerRead.data 
    ? (parseFloat(ethers.formatUnits(borrowPowerRead.data.toString(), 18)) / 1000).toFixed(2)
    : '0.00';

  const borrowedAmountValue = borrowedAmountFormatted
    ? parseFloat(borrowedAmountFormatted)
    : 0;
  
  const borrowPowerValue = borrowPowerFormatted
    ? parseFloat(borrowPowerFormatted)
    : 0;
  
  const borrowPowerPercentage = borrowedAmountValue && borrowPowerValue
    ? (borrowedAmountValue / (borrowedAmountValue + borrowPowerValue)) * 100
    : 0;
  
  const formattedBorrowPowerPercentage = borrowPowerPercentage.toFixed(2);  

  useEffect(() => {
    if (depositReadResult.data) {
      const data = depositReadResult.data as [string, BigInt]; 
    const convertedDeposit = {
      nftContract: data[0],
      tokenId: data[1].toString()
    };
      setDepositedNFTs(current => [...current, convertedDeposit]);
      setDepositIndex(depositIndex + 1);
    }
    if (depositReadResult.error) {
      console.log("No more NFTs or an error occurred:", depositReadResult.error.message);
    }
  }, [depositReadResult.data, depositReadResult.error, depositIndex]);

  useEffect(() => {
    const fetchNFTs = async () => {
      setLoadingNFTs(true);
      try {
        const userResponse = await fetch(`/api/nfts/fetch/${address}`);
        const userData = await userResponse.json() as NFT[];
        console.log("User has these NFTs: ", userData)
        setNFTs(userData);

        const grouped = userData.reduce<GroupedNFTs>((acc, nft) => {
          const collection = nft.collectionName || 'Unknown';
          acc[collection] = acc[collection] || [];
          acc[collection].push(nft);
          return acc;
        }, {});
        setGroupedNFTs(grouped);

        const facilitatorResponse = await fetch(`/api/nfts/fetch/${facilitatorContractAddress}`);
        const facilitatorData = await facilitatorResponse.json() as NFT[];
        console.log("Facilitator has these NFTs: ", facilitatorData)

        if (depositedNFTs.length > 0) {
          console.log("User has deposited NFTs, depositedNFTs: ", depositedNFTs);
          const userNFTs = filterUserNFTs(facilitatorData, depositedNFTs);
          console.log("User has these NFTs deposited: ", userNFTs);
          const groupedDeposited = userNFTs.reduce<GroupedNFTs>((acc, nft) => {
            const collection = nft.collectionName || 'Unknown';
            acc[collection] = acc[collection] || [];
            acc[collection].push(nft);
            return acc;
          }, {});
          console.log("Grouped deposited: ", groupedDeposited);
          setGroupedDepositedNFTs(groupedDeposited);
        } else {
          console.log("No NFTs deposited yet");
        }
      } catch (error) {
        console.error("Error fetching NFTs: ", error);
      } finally {
        setLoadingNFTs(false);
      }
    };

    fetchNFTs();
  }, [address, depositedNFTs]);

  useEffect(() => {
    const fetchAuctionNFTs = async () => {
      try {
        const userResponse = await fetch(`/api/nfts/optimism`);
        const userData = await userResponse.json() as NFT[];
        console.log("Auction NFTs: ", userData);
        setAuctionNFTs(userData);

        const grouped = userData.reduce<GroupedNFTs>((acc, nft) => {
          const collection = nft.collectionName || 'Unknown';
          acc[collection] = acc[collection] || [];
          acc[collection].push(nft);
          return acc;
        }, {});
        setGroupedAuctionNFTs(grouped);

      } catch (error) {
        console.error("Error fetching Auction NFTs: ", error);
      }
    };

    fetchAuctionNFTs();
  }, []);

  return (
    <div>
      {!address ? (
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <p className="font-bold text-center text-2xl mt-4">Please, connect your wallet</p>
          <p className="text-center text-xl mt-4">Please connect your wallet to see your NFT collaterals and borrowings</p>
        </div>
      ) : (
        <div style={{ padding: '120px'}} className="overflow-y-auto max-h-[94vh] nft-scroll">
          <Tabs defaultValue="nft">
            <TabsList className="grid mx-auto w-1/2 grid-cols-2 mb-4">
              <TabsTrigger value="nft">Supply NFT</TabsTrigger>
              <TabsTrigger value="optimism">Supply Optimism</TabsTrigger>
              {/* <TabsTrigger value="auction">Auction</TabsTrigger> */}
            </TabsList>
            <TabsContent value="nft">
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                {/* Left side */}
                <div style={{ width: '50%' }}> 
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-xl">Your supplies</CardTitle>
                    </CardHeader>
                    <CardContent className='pl-16 pr-16'>
                      {Object.entries(groupedDepositedNFTs).map(([collectionName, nfts]) => (
                        <div className="pb-4">
                          <CardTitle className="text-lg mb-4">{collectionName}</CardTitle>
                          <Carousel>
                            <CarouselContent>
                              {nfts.map((nft, index) => (
                                <CarouselItem key={nft.tokenId} className="xl:basis-1/2 2xl:basis-1/3">
                                  <Card>
                                    <CardContent className='p-0 rounded-lg'>
                                      <Image 
                                        src={nft.image} 
                                        alt={nft.name} 
                                        width={400}
                                        height={400}
                                        className='rounded-t-lg'
                                      />
                                    </CardContent>
                                    <CardContent className="p-4">
                                      <Label className="text-md pl-2">{nft.name}</Label>
                                      <div className="flex items-center space-x-2 pl-2 pt-2">
                                        <NFTDeposited key={nft.tokenId} nft={nft}/>
                                      </div>
                                    </CardContent>
                                  </Card>
                                </CarouselItem>
                              ))}
                            </CarouselContent>
                            <CarouselPrevious />
                            <CarouselNext />
                          </Carousel>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                  <Card className="mt-4">
                    <CardHeader>
                      <CardTitle className="text-xl">Assets to supply</CardTitle>
                    </CardHeader>
                    <CardContent className='pl-16 pr-16'>
                      {Object.entries(groupedNFTs).map(([collectionName, nfts]) => (
                        <div className="pb-4">
                          <CardTitle className="text-lg mb-4">{collectionName}</CardTitle>
                          <Carousel>
                            <CarouselContent>
                              {nfts.map((nft, index) => (
                                <CarouselItem key={nft.tokenId} className="xl:basis-1/2 2xl:basis-1/3">
                                  <Card>
                                    <CardContent className='p-0 rounded-lg'>
                                      <Image 
                                        src={nft.image} 
                                        alt={nft.name} 
                                        width={400}
                                        height={400}
                                        className='rounded-t-lg'
                                      />
                                    </CardContent>
                                    <CardContent className="p-4">
                                      <Label className="text-md pl-2">{nft.name}</Label>
                                      <div className="flex items-center space-x-2 pl-2 pt-2">
                                        <NFTAvailable key={nft.tokenId} nft={nft}/>
                                      </div>
                                    </CardContent>
                                  </Card>
                                </CarouselItem>
                              ))}
                            </CarouselContent>
                            <CarouselPrevious />
                            <CarouselNext />
                          </Carousel>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
                {/* Right side */}
                <div style={{ width: '50%', paddingLeft: '15px' }}>
                  {/* Content for the right side */}
                  <div>
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-xl">Your borrows</CardTitle>
                        <CardDescription className="pt-2">
                          <Badge variant="outline" className="rounded-sm">Borrow power used {formattedBorrowPowerPercentage}%</Badge>
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[175px]">Asset</TableHead>
                              <TableHead className="text-center w-[190px]">Debt</TableHead>
                              <TableHead className="text-center w-[210px]">APY</TableHead>
                              <TableHead></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <TableRow>
                              <TableCell className="font-medium">
                                <div className="flex items-center space-x-3 mt-2">
                                  <Avatar> 
                                    <AvatarImage src="https://s2.coinmarketcap.com/static/img/coins/64x64/11840.png"/>
                                    <AvatarFallback>OP</AvatarFallback>
                                  </Avatar>
                                  <Label>OP</Label>
                                </div>
                              </TableCell>
                              <TableCell className="text-center">{borrowedAmountFormatted}</TableCell>
                              <TableCell className="text-center">6.90 %</TableCell>
                              <TableCell className="text-right">
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button>Repay</Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Repay OP</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        <Input placeholder="Amount" value={repayAmount} onChange={(e) => setRepayAmount(e.target.value)} />
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <Repay amount={repayAmount} />
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                    <Card className="mt-4">
                      <CardHeader>
                        <CardTitle className="text-xl">Assets to borrow</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[175px]">Asset</TableHead>
                              <TableHead className="text-center w-[190px]">Available</TableHead>
                              <TableHead className="text-center w-[210px]">APY</TableHead>
                              <TableHead></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <TableRow>
                              <TableCell className="font-medium">
                                <div className="flex items-center space-x-3 mt-2">
                                  <Avatar> 
                                    <AvatarImage src="https://s2.coinmarketcap.com/static/img/coins/64x64/11840.png"/>
                                    <AvatarFallback>OP</AvatarFallback>
                                  </Avatar>
                                  <Label>OP</Label>
                                </div>
                              </TableCell>
                              <TableCell className="text-center">{borrowPowerFormatted}</TableCell>
                              <TableCell className="text-center">6.90 %</TableCell>
                              <TableCell className="text-right">
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button>Borrow</Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Borrow OP</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        <Input placeholder="Amount" value={borrowAmount} onChange={(e) => setBorrowAmount(e.target.value)} />
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <Borrow amount={borrowAmount} />
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="optimism">
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                {/* Left side */}
                <div style={{ width: '50%' }}>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-xl">Assets to supply</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[175px]">Asset</TableHead>
                            <TableHead className="text-center w-[190px]">Available</TableHead>
                            <TableHead className="text-center w-[210px]">APY</TableHead>
                            <TableHead></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow>
                            <TableCell className="font-medium">
                              <div className="flex items-center space-x-3 mt-2">
                                <Avatar> 
                                  <AvatarImage src="https://s2.coinmarketcap.com/static/img/coins/64x64/11840.png"/>
                                  <AvatarFallback>OP</AvatarFallback>
                                </Avatar>
                                <Label>OP</Label>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">{opBalanceFormatted}</TableCell>
                            <TableCell className="text-center">4.20 %</TableCell>
                            <TableCell className="text-right">
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button>Supply</Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Supply OP</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      <Input placeholder="Amount" value={supplyAmount} onChange={(e) => setSupplyAmount(e.target.value)} />
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <Supply amount={supplyAmount} />
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </div>
                {/* Right side */}
                <div style={{ width: '50%', paddingLeft: '15px' }}>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-xl">Your supplies</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[175px]">Asset</TableHead>
                            <TableHead className="text-center w-[190px]">Supplied</TableHead>
                            <TableHead className="text-center w-[210px]">APY</TableHead>
                            <TableHead></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow>
                            <TableCell className="font-medium">
                              <div className="flex items-center space-x-3 mt-2">
                                <Avatar> 
                                  <AvatarImage src="https://s2.coinmarketcap.com/static/img/coins/64x64/11840.png"/>
                                  <AvatarFallback>OP</AvatarFallback>
                                </Avatar>
                                <Label>OP</Label>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">{opSuppliedFormatted}</TableCell>
                            <TableCell className="text-center">4.20 %</TableCell>
                            <TableCell className="text-right">
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button>Withdraw</Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Withdraw OP</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      <Input placeholder="Amount" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} />
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <Withdraw amount={withdrawAmount} />
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </div>
              </div>
              <Card className="mt-4"> {/* Adjust margins as needed */}
                <CardHeader>
                  <CardTitle className="text-xl">Available for Auction</CardTitle>
                </CardHeader>
                <CardContent className='pl-16 pr-16'>
                  {Object.entries(groupedAuctionNFTs).map(([collectionName, nfts]) => (
                    <div className="pb-4">
                      <CardTitle className="text-lg mb-4">{collectionName}</CardTitle>
                      <Carousel>
                        <CarouselContent>
                          {nfts.map((nft, index) => (
                            <CarouselItem key={nft.tokenId} className="lg:basic-1/3  xl:basis-1/4 2xl:basis-1/6">
                              <Card>
                                <CardContent className='p-0 rounded-lg'>
                                  <Image 
                                    src={nft.image} 
                                    alt={nft.name} 
                                    width={400}
                                    height={400}
                                    className='rounded-t-lg'
                                  />
                                </CardContent>
                                <CardContent className="p-4 flex flex-col">
                                  <div className="flex justify-between items-center">
                                    <Label className="text-md pl-2">{nft.name}</Label>
                                    <Label className="text-md pr-2">
                                      {nft.price !== undefined && !isNaN(Number(nft.price))
                                        ? `${Number(nft.price) * 1000} OP`
                                        : 'Price not available'}
                                    </Label>
                                  </div>
                                  <div className="flex items-center space-x-2 pl-2 pt-2">
                                    <Button variant={'outline'}>Buy</Button>
                                  </div>
                                </CardContent>
                              </Card>
                            </CarouselItem>
                          ))}
                        </CarouselContent>
                        <CarouselPrevious />
                        <CarouselNext />
                      </Carousel>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  )
}

export default Page;
