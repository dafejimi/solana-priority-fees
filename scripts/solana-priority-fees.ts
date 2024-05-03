
import { ComputeBudgetProgram, Connection, Keypair, LAMPORTS_PER_SOL, SystemProgram, TransactionInstruction, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import bs58 from "bs58";
import 'dotenv/config';

const rpcUrl = process.env.SOLANA_RPC;
const wsUrl = process.env.SOLANA_WSS;
const privateKey = process.env.PRIVATE_KEY;

const CHAINSTACK_RPC = process.env.SOLANA_RPC || "";
const SOLANA_CONNECTION = new Connection(CHAINSTACK_RPC, {wsEndpoint:process.env.SOLANA_WSS, commitment: "confirmed"});
console.log(`Connected to Solana RPC at ${CHAINSTACK_RPC.slice(0, -36)}`);

// Decodes the provided environment variable private key and generates a Keypair.
const decodedPrivateKey = new Uint8Array(bs58.decode(process.env.PRIVATE_KEY!));
const FROM_KEYPAIR = Keypair.fromSecretKey(decodedPrivateKey);
console.log(`Initial Setup: Public Key - ${FROM_KEYPAIR.publicKey.toString()}`);

// Config priority fee and amount to transfer
const PRIORITY_RATE = 25000; // MICRO_LAMPORTS
const AMOUNT_TO_TRANSFER = 0.001 * LAMPORTS_PER_SOL;

// Instruction to set the compute unit price for priority fee
const PRIORITY_FEE_INSTRUCTIONS = ComputeBudgetProgram.setComputeUnitPrice({microLamports: PRIORITY_RATE});

async function sendTransactionWithPriorityFee() {
  // Create instructions for the transaction
  const instructions: TransactionInstruction[] = [
    SystemProgram.transfer({
      fromPubkey: FROM_KEYPAIR.publicKey,
      toPubkey: FROM_KEYPAIR.publicKey,
      lamports: AMOUNT_TO_TRANSFER
    }),
    PRIORITY_FEE_INSTRUCTIONS
  ];

  // Get the latest blockhash
  let latestBlockhash = await SOLANA_CONNECTION.getLatestBlockhash('confirmed');
  console.log(" ✅ - Fetched latest blockhash. Last Valid Height:", latestBlockhash.lastValidBlockHeight);

  // Generate the transaction message
  const messageV0 = new TransactionMessage({
    payerKey: FROM_KEYPAIR.publicKey,
    recentBlockhash: latestBlockhash.blockhash,
    instructions: instructions
  }).compileToV0Message();
  console.log(" ✅ - Compiled Transaction Message");

  // Create a VersionedTransaction and sign it
  const transaction = new VersionedTransaction(messageV0);
  transaction.sign([FROM_KEYPAIR]);
  console.log(" ✅ - Transaction Signed");

  console.log(`Sending ${AMOUNT_TO_TRANSFER / LAMPORTS_PER_SOL} SOL from ${FROM_KEYPAIR.publicKey} to ${FROM_KEYPAIR.publicKey} with priority fee rate ${PRIORITY_RATE} microLamports`);

  try {
    // Send the transaction to the network
    const txid = await SOLANA_CONNECTION.sendTransaction(transaction, { maxRetries: 15 });
    console.log(" ✅ - Transaction sent to network");

    // Confirm the transaction
    const confirmation = await SOLANA_CONNECTION.confirmTransaction({
      signature: txid,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
    });
    if (confirmation.value.err) {
      throw new Error("🚨 Transaction not confirmed.");
    }

    // Get the transaction result
    const txResult = await SOLANA_CONNECTION.getTransaction(txid, {maxSupportedTransactionVersion: 0})
    console.log('🚀 Transaction Successfully Confirmed!', '\n', `https://solscan.io/tx/${txid}`);
    console.log(`Transaction Fee: ${txResult?.meta?.fee} Lamports`);
  } catch (error) {
    console.log(error);
  }
}

// Call the function to send the transaction with a priority fee
sendTransactionWithPriorityFee();