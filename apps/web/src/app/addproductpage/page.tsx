"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ethers } from "ethers"
import { Button } from "../../components/ui/button"
import { Card } from "../../components/ui/card"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Badge } from "../../components/ui/badge"
import { Upload, X } from "lucide-react"
import { useUser } from "@clerk/nextjs" // Import Clerk's useUser hook

// Assume the ABI is available after compiling your contract with Hardhat
// You will need to adjust this path based on your project structure.
import SupplyChainABI from "@/../artifacts/contracts/SupplyChain.sol/SupplyChain.json"

// IMPORTANT: Replace this with your deployed contract address
const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3"

export default function AddProductPage() {
  // State for form data
  const [productName, setProductName] = useState("")
  const [quantity, setQuantity] = useState("")
  const [batchNumber, setBatchNumber] = useState("")

  // State for blockchain interaction
  const [provider, setProvider] = useState<ethers.providers.Web3Provider | null>(null)
  const [signer, setSigner] = useState<ethers.Signer | null>(null)
  const [contract, setContract] = useState<ethers.Contract | null>(null)
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [transactionHash, setTransactionHash] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [productTags, setProductTags] = useState(["Cloth", "Q1"])

  // Get the authenticated user from Clerk
  const { isLoaded, isSignedIn, user } = useUser();

  // Function to connect to a user's wallet (e.g., MetaMask)
  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        setError("MetaMask is not installed. Please install it to use this app.")
        return
      }

      const provider = new ethers.providers.Web3Provider(window.ethereum)
      const accounts = await provider.send("eth_requestAccounts", [])
      const signer = provider.getSigner()
      const contractInstance = new ethers.Contract(contractAddress, SupplyChainABI.abi, signer)

      setProvider(provider)
      setSigner(signer)
      setContract(contractInstance)
      setWalletAddress(accounts[0])
      setError(null)
    } catch (err) {
      console.error(err)
      setError("Failed to connect wallet. Please ensure MetaMask is unlocked and connected.")
    }
  }

  // Effect to connect wallet on page load
  useEffect(() => {
    connectWallet()
  }, [])

  // Function to submit product data to the blockchain
  const createProduct = async () => {
    if (!contract || !signer || !user) {
      setError("Please ensure you are signed in and have connected your wallet.")
      return
    }

    if (!productName || !quantity || !batchNumber) {
      setError("Please fill out all product details.")
      return
    }

    try {
      setLoading(true)
      setError(null)
      setTransactionHash(null)

      // Convert quantity to a BigNumber as required by the contract
      const quantityBn = ethers.BigNumber.from(quantity)

      // Call the createProduct function on the smart contract with the Clerk user ID
      // NOTE: Your smart contract's createProduct function MUST be updated to accept a userId string.
      const tx = await contract.createProduct(productName, quantityBn, batchNumber, user.id)
      setTransactionHash(tx.hash)

      // Wait for the transaction to be mined
      await tx.wait()
      setLoading(false)
      alert("Product successfully created on the blockchain!")

      // Reset form fields
      setProductName("")
      setQuantity("")
      setBatchNumber("")
      setTransactionHash(null)
    } catch (err) {
      console.error(err)
      setLoading(false)
      setError("Transaction failed. Please check the console for details.")
    }
  }

  const removeTag = (tagToRemove: string) => {
    // This function is no longer used in the simplified version, but kept for context.
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-xl font-semibold">
            SupChain
          </Link>
          <div className="flex items-center gap-4">
            {isLoaded && isSignedIn && user ? (
              <Badge variant="outline" className="text-sm">
                Signed in as: {user.primaryEmailAddress?.emailAddress}
              </Badge>
            ) : (
              // You would typically have a Clerk sign-in button here
              <Button>Sign In</Button>
            )}
            {walletAddress ? (
              <Badge variant="outline" className="text-sm">
                Connected: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
              </Badge>
            ) : (
              <Button onClick={connectWallet}>Connect Wallet</Button>
            )}
            <Button variant="ghost" className="text-sm">
              Profile →
            </Button>
            <Button variant="ghost" className="text-red-600 text-sm">
              Log Out
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-6">
        <Card className="p-6">
          <div className="space-y-6">
            <h2 className="text-2xl font-bold mb-4">Add New Product</h2>

            {error && (
              <div className="p-4 bg-red-100 text-red-700 rounded-md">
                {error}
              </div>
            )}

            {transactionHash && (
              <div className="p-4 bg-green-100 text-green-700 rounded-md break-words">
                Transaction sent! Hash: <a href={`https://etherscan.io/tx/${transactionHash}`} target="_blank" rel="noopener noreferrer" className="underline">{transactionHash}</a>
              </div>
            )}

            {/* Conditionally render the form only if the user is signed in */}
            {isLoaded && isSignedIn && (
              <>
                <div>
                  <Label htmlFor="productName">Product Name</Label>
                  <Input
                    id="productName"
                    placeholder="e.g., Tshirt"
                    className="mt-1"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    placeholder="e.g., 100"
                    className="mt-1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="batchNumber">Batch Number</Label>
                  <Input
                    id="batchNumber"
                    placeholder="e.g., BATCH-XYZ-123"
                    className="mt-1"
                    value={batchNumber}
                    onChange={(e) => setBatchNumber(e.target.value)}
                  />
                </div>

                <div className="flex justify-center pt-8">
                  <Button onClick={createProduct} disabled={loading} className="bg-slate-800 hover:bg-slate-900 text-white px-8">
                    {loading ? "Creating..." : "Create Product"}
                  </Button>
                </div>
              </>
            )}

            {/* Message to prompt user to sign in */}
            {isLoaded && !isSignedIn && (
              <div className="text-center p-8">
                <h3 className="text-lg font-semibold">Please sign in to add a new product.</h3>
                {/* A link to your sign-in page would go here */}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
