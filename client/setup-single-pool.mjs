import { SCENARIOS } from './scenarios.mjs';

export function deriveDefaultDepositSeed(poolAddress) {
  return `svsp${String(poolAddress).slice(0, 28)}`;
}

export function buildSetupPlan(poolAddress = 'POOL_PLACEHOLDER') {
  return {
    poolAddress,
    defaultDepositSeed: deriveDefaultDepositSeed(poolAddress),
    requiredAccounts: [
      'vote account',
      'pool account',
      'pool stake account',
      'pool mint account',
      'payer',
      'metadata account'
    ],
    scenarios: SCENARIOS.map((scenario) => ({
      name: scenario.name,
      inCuComparison: scenario.inCuComparison,
      notes: scenario.notes
    }))
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const poolAddress = process.argv[2] || 'POOL_PLACEHOLDER';
  console.log(JSON.stringify(buildSetupPlan(poolAddress), null, 2));
}
