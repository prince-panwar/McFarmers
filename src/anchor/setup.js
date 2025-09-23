import { Program } from "@coral-xyz/anchor"
import { IDL } from "./idl"
import { clusterApiUrl, Connection } from "@solana/web3.js"

export const PROGRAM_ID = "4iRL6eXQxeA87WVZvjXYBDoBRjfmziL3mEtXeiVz5j1D"
export const NETWORK = "https://api.devnet.solana.com"
export const connection = new Connection(clusterApiUrl("devnet"), "confirmed")

export const program = new Program(IDL, {
  connection,
})
