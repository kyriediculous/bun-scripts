import { http, createConfig } from 'wagmi'
import { arbitrum } from 'wagmi/chains'
import { privateKeyToAccount } from 'viem/accounts'
import { createPublicClient, createWalletClient, formatEther, parseAbi, type Address } from 'viem'

// Replace with your Alchemy API key
const API_KEY = "vMsgfz6xKYg5MTI-o2dhRjrY1J-DlzoG";

// Replace with the private key of your Ethereum account
const PRIVATE_KEY = process.env.PRIVATE_KEY ?? "";

// Replace with the token address you wish to transfer
const TOKEN = "0x4b0e5e54df6d5eccc7b2f838982411dc93253daf"; // tLPT-Night-Node on arbitrum

// The Recipient, clean address to receive the tokens
const RECIPIENT_ADDRESS = (process.env.RECEIVER || "0x12B69890F64199bC15122c380214fef69e354BdE") as Address;

// Create account from private key
const account = privateKeyToAccount(`0x${PRIVATE_KEY}`);

// Create wagmi config
const config = createConfig({
    chains: [arbitrum],
    transports: {
        [arbitrum.id]: http(`https://arb-mainnet.g.alchemy.com/v2/${API_KEY}`)
    },
});

// Create public client
const publicClient = createPublicClient({
    chain: arbitrum,
    transport: http(`https://arb-mainnet.g.alchemy.com/v2/${API_KEY}`)
});

const walletClient = createWalletClient({
    chain: arbitrum,
    transport: http(`https://arb-mainnet.g.alchemy.com/v2/${API_KEY}`),
    account,
});

// ERC20 ABI
const erc20Abi = parseAbi([
    'function balanceOf(address owner) view returns (uint256)',
    'function transfer(address to, uint256 amount) returns (bool)',
]);

async function transferTokens() {
    console.log("Initiating token transfer...");

    try {
        // Get token balance
        const balance = await publicClient.readContract({
            address: TOKEN as Address,
            abi: erc20Abi,
            functionName: 'balanceOf',
            args: [account.address],
        });

        console.log("Token balance:", formatEther(balance));

        // Prepare and send the transaction
        const client = config.getClient();
        const hash = await walletClient.writeContract({
            address: TOKEN as Address,
            abi: erc20Abi,
            functionName: 'transfer',
            args: [RECIPIENT_ADDRESS, balance],
            account,
        });

        console.log("Transaction sent successfully!");
        console.log("Transaction hash:", hash);

        // Wait for the transaction to be mined
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        console.log("Transaction mined in block:", receipt.blockNumber.toString());
    } catch (error) {
        console.error("Error during token transfer:", error);
    }
}

// Run the transfer
transferTokens();