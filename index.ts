import { createPublicClient, http, parseAbiItem, formatEther, type Address } from 'viem';
import { arbitrum, mainnet } from 'viem/chains';

const ALCHEMY_RPC_URL = 'https://arb-mainnet.g.alchemy.com/v2/xic2ssHjtluHp2iH8O5NmbrcdcH2CMdJ';

const client = createPublicClient({
    chain: arbitrum,
    transport: http(ALCHEMY_RPC_URL),
});

const ensClient = createPublicClient({
    chain: mainnet,
    transport: http('https://eth-mainnet.g.alchemy.com/v2/xic2ssHjtluHp2iH8O5NmbrcdcH2CMdJ'),
});

const CONTRACT_ADDRESS = '0xcFE4E2879B786C3aa075813F0E364bb5acCb6aa0';

// Event signature
const EVENT_SIGNATURE = '0xb8e138887d0aa13bab447e82de9d5c1777041ecd21ca36ba824ff1e6c07ddda4';

const TARGET_PROPOSAL_ID = 86219930912738253014739146321518371829012640390411818660952977221703750941760n;

const eventAbi = parseAbiItem('event VoteCast(address indexed voter, uint256 proposalId, uint8 support, uint256 weight, string reason)');
async function getVotes() {
    console.log("Fetching logs...");
    let logs;
    try {
        logs = await client.getLogs({
            address: CONTRACT_ADDRESS,
            event: eventAbi,
            fromBlock: 244281674n,
            toBlock: 'latest',
        });
    } catch (e) {
        console.error("Error fetching logs:", e);
        return;
    }

    let yesVotes: any[] = [];
    let noVotes: any[] = [];
    let abstainVotes: any[] = [];
    let totalYesWeight = 0n;
    let totalNoWeight = 0n;
    let totalAbstainWeight = 0n;

    for (let i = 0; i < logs.length; i++) {
        const log = logs[i];

        // Decode the log data
        const [proposalId] = log.topics.slice(1).map(t => BigInt(t));
        const voter = `0x${log?.topics?.[1]?.slice(-40)}`;

        if (log.args.proposalId != 86219930912738253014739146321518371829012640390411818660952977221703750941760n) {
            continue;
        }

        const ens = await ensClient.getEnsName({
            address: voter as Address,
        });

        if (log.args.support?.toString() === "1") {
            yesVotes.push({
                voter: ens || voter, weight: formatEther(log.args.weight || 0n)
            });
            totalYesWeight += log.args.weight || 0n;
        } else if (log.args.support?.toString() === "0") {
            noVotes.push({
                voter: ens || voter, weight: formatEther(log.args.weight || 0n)
            });
            totalNoWeight += log.args.weight || 0n;
        } else {
            abstainVotes.push({
                voter: ens || voter, weight: formatEther(log.args.weight || 0n)
            });
            totalAbstainWeight += log.args.weight || 0n;
        }
    }

    console.log('Yes Votes:');
    console.table(yesVotes);
    console.log(`Total Yes Weight: ${formatEther(totalYesWeight)}`);
    console.log('\nNo Votes:');
    console.table(noVotes);
    console.log(`Total No Weight: ${formatEther(totalNoWeight)}`);
    console.log(`\nTotal Votes: ${yesVotes.length + noVotes.length}`);
    console.log(`\nAbstain Votes:`);
    console.table(abstainVotes);
    console.log(`Total Abstain Weight: ${formatEther(totalAbstainWeight)}`);
}

(async () => {
    await getVotes();
})();