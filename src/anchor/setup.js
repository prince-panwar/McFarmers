import { Program } from "@coral-xyz/anchor"
import { IDL } from "./idl"
import { clusterApiUrl, Connection } from "@solana/web3.js"

export const PROGRAM_ID = "GjezjztjW5knE9JuvnCFtU7tu8WFmdgvzL4YHnb7PFRo"
export const NETWORK = "https://api.devnet.solana.com"
export const connection = new Connection(clusterApiUrl("devnet"), "confirmed")

// Initialize program first
export const program = new Program(IDL, {
  connection,
})

// Export mint address
export const mintAddress = "HsGeN22851E3uGJ3nERibwB4dViU3YsbVgiau3kgo25c"


export const getAccountData = async (walletPublicKey = null) => {
  try {
    // Fetch all pools
    const pools = (program.account && program.account.pool)
      ? await program.account.pool.all()
      : []

    // Fetch user stakes (all or filtered by wallet)
    let userStakes = []
    const hasUserStake = program.account && program.account.userStake
    if (hasUserStake) {
      if (walletPublicKey) {
        userStakes = await program.account.userStake.all([
          {
            memcmp: {
              offset: 8, // skip 8-byte Anchor discriminator
              bytes: walletPublicKey.toBase58(), // match user: Pubkey field
            },
          },
        ])
      } else {
        userStakes = await program.account.userStake.all()
      }
    }

    return { pools, userStakes }
  } catch (error) {
    console.error("Error fetching account data:", error)
    return { pools: [], userStakes: [] }
  }
}

