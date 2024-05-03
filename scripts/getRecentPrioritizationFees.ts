import { Connection, PublicKey } from '@solana/web3.js';
import 'dotenv/config';

// Strongly type the environment variable getter
function getEnvVariable(key: string): string {
    const value = process.env[key];
    if (!value) {
        throw new Error(`Environment variable ${key} is not set.`);
    }
    return value;
}

// Define interfaces for more explicit typing
interface PrioritizationFeeObject {
    slot: number;
    prioritizationFee: number;
}

interface Config {
    lockedWritableAccounts: PublicKey[];
}

const getPrioritizationFees = async () => {
    try {
        const SOLANA_RPC = getEnvVariable('SOLANA_RPC');
        const connection = new Connection(SOLANA_RPC);

        const publicKey = new PublicKey('JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4');

        const config: Config = {
            lockedWritableAccounts: [publicKey]
        };
          
        const prioritizationFeeObjects = await connection.getRecentPrioritizationFees(config) as PrioritizationFeeObject[];

        if (prioritizationFeeObjects.length === 0) {
            console.log('No prioritization fee data available.');
            return;
        }

        // Extract slots and sort them
        const slots = prioritizationFeeObjects.map(feeObject => feeObject.slot).sort((a, b) => a - b);
        
        // Extract slots range
        const slotsRangeStart = slots[0];
        const slotsRangeEnd = slots[slots.length - 1];

        // Calculate the average including zero fees
        const averageFeeIncludingZeros = prioritizationFeeObjects.length > 0
            ? Math.floor(prioritizationFeeObjects.reduce((acc, feeObject) => acc + feeObject.prioritizationFee, 0) / prioritizationFeeObjects.length)
            : 0;

        // Filter out prioritization fees that are equal to 0 for other calculations
        const nonZeroFees = prioritizationFeeObjects
            .map(feeObject => feeObject.prioritizationFee)
            .filter(fee => fee !== 0);

        // Calculate the average of the non-zero fees
        const averageFeeExcludingZeros = nonZeroFees.length > 0 
            ? Math.floor(nonZeroFees.reduce((acc, fee) => acc + fee, 0) / nonZeroFees.length )
            : 0;

        // Calculate the median of the non-zero fees
        const sortedFees = nonZeroFees.sort((a, b) => a - b);
        let medianFee = 0;
        if (sortedFees.length > 0) {
            const midIndex = Math.floor(sortedFees.length / 2);
            medianFee = sortedFees.length % 2 !== 0
                ? sortedFees[midIndex]
                : Math.floor((sortedFees[midIndex - 1] + sortedFees[midIndex]) / 2);
        }

        console.log(`Slots examined for priority fees: ${prioritizationFeeObjects.length}`)
        console.log(`Slots range examined from ${slotsRangeStart} to ${slotsRangeEnd}`);
        console.log('====================================================================================')
        
        // You can use averageFeeIncludingZeros, averageFeeExcludingZeros, and medianFee in your transactions script
        console.log(` 💰 Average Prioritization Fee (including slots with zero fees): ${averageFeeIncludingZeros} micro-lamports.`);
        console.log(` 💰 Average Prioritization Fee (excluding slots with zero fees): ${averageFeeExcludingZeros} micro-lamports.`);
        console.log(` 💰 Median Prioritization Fee (excluding slots with zero fees): ${medianFee} micro-lamports.`);
    } catch (error) {
        console.error('Error fetching prioritization fees:', error);
    }
};

getPrioritizationFees();
