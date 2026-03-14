export const SCENARIOS = [
  {
    name: 'initialize_pool',
    fiveFunction: 'initialize_pool',
    functionIndex: 11,
    inCuComparison: true,
    notes: 'Core pool bootstrap parity check',
    parameters: {
      pool: 'POOL_PLACEHOLDER',
      payer: 'PAYER_PLACEHOLDER',
      vote_account: 'VOTE_PLACEHOLDER',
      pool_stake: 'POOL_STAKE_PLACEHOLDER',
      pool_mint: 'POOL_MINT_PLACEHOLDER',
      pool_stake_authority: 'STAKE_AUTH_PLACEHOLDER',
      pool_mint_authority: 'MINT_AUTH_PLACEHOLDER'
    }
  },
  {
    name: 'reactivate_pool_stake',
    fiveFunction: 'reactivate_pool_stake',
    functionIndex: 13,
    inCuComparison: true,
    notes: 'Pool stake re-delegation after deactivation period',
    parameters: {
      pool: 'POOL_PLACEHOLDER',
      pool_stake: 'POOL_STAKE_PLACEHOLDER',
      pool_stake_authority: 'STAKE_AUTH_PLACEHOLDER',
      vote_account: 'VOTE_PLACEHOLDER'
    }
  },
  {
    name: 'deposit_stake',
    fiveFunction: 'deposit_stake',
    functionIndex: 14,
    inCuComparison: true,
    notes: 'Pool-token mint parity with live mint CPI scaffolded',
    parameters: {
      vote_account_address: 'VOTE_PLACEHOLDER',
      pool: 'POOL_PLACEHOLDER',
      pool_mint: 'POOL_MINT_PLACEHOLDER',
      pool_mint_authority: 'MINT_AUTH_PLACEHOLDER',
      user_token_account: 'USER_TOKEN_PLACEHOLDER',
      pool_token_supply: 1000,
      pre_pool_stake: 10000,
      stake_added: 500
    }
  },
  {
    name: 'withdraw_stake',
    fiveFunction: 'withdraw_stake',
    functionIndex: 17,
    inCuComparison: true,
    notes: 'Pool-token burn parity with live burn CPI scaffolded',
    parameters: {
      vote_account_address: 'VOTE_PLACEHOLDER',
      pool: 'POOL_PLACEHOLDER',
      pool_mint: 'POOL_MINT_PLACEHOLDER',
      pool_mint_authority: 'MINT_AUTH_PLACEHOLDER',
      user_token_account: 'USER_TOKEN_PLACEHOLDER',
      user_stake_authority: 'WITHDRAW_AUTH_PLACEHOLDER',
      token_amount: 50,
      pool_token_supply: 1000,
      pre_pool_stake: 10000
    }
  }
];

export function createEmptyReportRow(name) {
  return {
    scenario: name,
    spl_signature: null,
    five_signature: null,
    spl_compute_units: null,
    five_compute_units: null,
    delta_absolute: null,
    delta_percent: null,
    status: 'pending',
    notes: 'Populate by running live SPL and 5IVE flows against the same scenario.'
  };
}
