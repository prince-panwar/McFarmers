import { Program } from "@coral-xyz/anchor"
import { IDL } from "./idl"
import { clusterApiUrl, Connection, PublicKey } from "@solana/web3.js"

export const PROGRAM_ID = "4iRL6eXQxeA87WVZvjXYBDoBRjfmziL3mEtXeiVz5j1D"
export const NETWORK = "https://api.devnet.solana.com"
export const connection = new Connection(clusterApiUrl("devnet"), "confirmed")

// Initialize program first
export const program = new Program(IDL, {
  connection,
})

// Export mint address
export const mintAddress = "YOUR_ACTUAL_MINT_ADDRESS" // Replace with your token mint

// Function to get account data (call this when needed, not at module level)
export const getAccountData = async () => {
  try {
    // Get pool accounts instead of vault (based on your program structure)
    const poolAccounts = await program.account.pool.all()
    const userStakeAccounts = await program.account.userStake.all()

    return {
      pools: poolAccounts,
      userStakes: userStakeAccounts,
    }
  } catch (error) {
    console.error("Error fetching account data:", error)
    return { pools: [], userStakes: [] }
  }
}
