// Optional: anchor a record hash on a real public testnet (e.g. Polygon Amoy, Sepolia).
// This is OFF by default and only activates if RPC_URL + PRIVATE_KEY are set in .env.
// It works by sending a 0-value self-transaction with the hash embedded in the tx `data`
// field — a common lightweight way to timestamp/anchor data on-chain without deploying
// a smart contract.

import { ethers } from "ethers";

export function isOnchainConfigured() {
  return Boolean(process.env.RPC_URL && process.env.PRIVATE_KEY);
}

export async function anchorHashOnChain(recordHash) {
  if (!isOnchainConfigured()) {
    throw new Error("On-chain anchoring not configured. Set RPC_URL and PRIVATE_KEY in .env");
  }

  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

  const tx = await wallet.sendTransaction({
    to: wallet.address, // self-transaction, no funds transferred
    value: 0,
    data: ethers.hexlify(ethers.toUtf8Bytes(`faceverify:${recordHash}`)),
  });

  const receipt = await tx.wait();

  return {
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber,
    network: (await provider.getNetwork()).name,
  };
}

export async function verifyHashOnChain(txHash) {
  if (!isOnchainConfigured()) {
    throw new Error("On-chain anchoring not configured. Set RPC_URL and PRIVATE_KEY in .env");
  }
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
  const tx = await provider.getTransaction(txHash);
  if (!tx) return { found: false };

  const decoded = ethers.toUtf8String(tx.data);
  return { found: true, decoded, from: tx.from, blockNumber: tx.blockNumber };
}
