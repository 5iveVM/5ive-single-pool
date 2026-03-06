import { deriveDefaultDepositSeed } from './setup-single-pool.mjs';

export function buildStakeDelegationPlan(poolAddress, userWalletAddress, voteAccountAddress, stakeLamports) {
  const seed = deriveDefaultDepositSeed(poolAddress);
  return {
    poolAddress,
    userWalletAddress,
    voteAccountAddress,
    stakeLamports,
    createWithSeed: {
      base: userWalletAddress,
      seed,
      ownerProgram: 'Stake11111111111111111111111111111111111111'
    },
    note: 'Matches the upstream helper naming convention for the default intermediate deposit account.'
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [poolAddress = 'POOL_PLACEHOLDER', userWalletAddress = 'USER_PLACEHOLDER', voteAccountAddress = 'VOTE_PLACEHOLDER', stakeLamports = '1000000'] = process.argv.slice(2);
  console.log(
    JSON.stringify(
      buildStakeDelegationPlan(poolAddress, userWalletAddress, voteAccountAddress, Number(stakeLamports)),
      null,
      2
    )
  );
}
