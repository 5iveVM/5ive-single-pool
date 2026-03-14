/**
 * Auto-generated types for Program program
 * Generated from ABI
 */

export interface ProgramProgram {
  /**
   * Call account_type_uninitialized()
   */
  account_type_uninitialized(params: Account_type_uninitializedParams): FunctionBuilder;
  /**
   * Call account_type_pool()
   */
  account_type_pool(params: Account_type_poolParams): FunctionBuilder;
  /**
   * Call mint_decimals()
   */
  mint_decimals(params: Mint_decimalsParams): FunctionBuilder;
  /**
   * Call stake_authorize_staker()
   */
  stake_authorize_staker(params: Stake_authorize_stakerParams): FunctionBuilder;
  /**
   * Call stake_authorize_withdrawer()
   */
  stake_authorize_withdrawer(params: Stake_authorize_withdrawerParams): FunctionBuilder;
  /**
   * Call derive_pool()
   */
  derive_pool(params: Derive_poolParams): FunctionBuilder;
  /**
   * Call derive_pool_stake()
   */
  derive_pool_stake(params: Derive_pool_stakeParams): FunctionBuilder;
  /**
   * Call derive_pool_mint()
   */
  derive_pool_mint(params: Derive_pool_mintParams): FunctionBuilder;
  /**
   * Call derive_pool_stake_authority()
   */
  derive_pool_stake_authority(params: Derive_pool_stake_authorityParams): FunctionBuilder;
  /**
   * Call derive_pool_mint_authority()
   */
  derive_pool_mint_authority(params: Derive_pool_mint_authorityParams): FunctionBuilder;
  /**
   * Call derive_pool_mpl_authority()
   */
  derive_pool_mpl_authority(params: Derive_pool_mpl_authorityParams): FunctionBuilder;
  /**
   * Call quote_deposit_pool_tokens()
   */
  quote_deposit_pool_tokens(params: Quote_deposit_pool_tokensParams): FunctionBuilder;
  /**
   * Call quote_withdraw_stake()
   */
  quote_withdraw_stake(params: Quote_withdraw_stakeParams): FunctionBuilder;
  /**
   * Call initialize_pool()
   */
  initialize_pool(params: Initialize_poolParams): FunctionBuilder;
  /**
   * Call reactivate_pool_stake()
   */
  reactivate_pool_stake(params: Reactivate_pool_stakeParams): FunctionBuilder;
  /**
   * Call deposit_stake()
   */
  deposit_stake(params: Deposit_stakeParams): FunctionBuilder;
  /**
   * Call deposit_stake_quote_only()
   */
  deposit_stake_quote_only(params: Deposit_stake_quote_onlyParams): FunctionBuilder;
  /**
   * Call withdraw_stake_quote_only()
   */
  withdraw_stake_quote_only(params: Withdraw_stake_quote_onlyParams): FunctionBuilder;
  /**
   * Call withdraw_stake()
   */
  withdraw_stake(params: Withdraw_stakeParams): FunctionBuilder;
  /**
   * Call withdraw_excess_lamports()
   */
  withdraw_excess_lamports(params: Withdraw_excess_lamportsParams): FunctionBuilder;
  /**
   * Call create_token_metadata()
   */
  create_token_metadata(params: Create_token_metadataParams): FunctionBuilder;
  /**
   * Call update_token_metadata()
   */
  update_token_metadata(params: Update_token_metadataParams): FunctionBuilder;
}

export interface Account_type_uninitializedParams {
}

export interface Account_type_poolParams {
}

export interface Mint_decimalsParams {
}

export interface Stake_authorize_stakerParams {
}

export interface Stake_authorize_withdrawerParams {
}

export interface Derive_poolParams {
  args: {
    vote_account_address: string | { toBase58(): string };
  };
}

export interface Derive_pool_stakeParams {
  args: {
    pool_address: string | { toBase58(): string };
  };
}

export interface Derive_pool_mintParams {
  args: {
    pool_address: string | { toBase58(): string };
  };
}

export interface Derive_pool_stake_authorityParams {
  args: {
    pool_address: string | { toBase58(): string };
  };
}

export interface Derive_pool_mint_authorityParams {
  args: {
    pool_address: string | { toBase58(): string };
  };
}

export interface Derive_pool_mpl_authorityParams {
  args: {
    pool_address: string | { toBase58(): string };
  };
}

export interface Quote_deposit_pool_tokensParams {
  args: {
    pre_token_supply: number | bigint;
    pre_pool_stake: number | bigint;
    user_stake_to_deposit: number | bigint;
  };
}

export interface Quote_withdraw_stakeParams {
  args: {
    pre_token_supply: number | bigint;
    pre_pool_stake: number | bigint;
    user_tokens_to_burn: number | bigint;
  };
}

export interface Initialize_poolParams {
  accounts: {
    pool: string | { toBase58(): string };
    payer: string | { toBase58(): string };
    vote_account: string | { toBase58(): string };
    pool_stake: string | { toBase58(): string };
    pool_mint: string | { toBase58(): string };
    pool_stake_authority: string | { toBase58(): string };
    pool_mint_authority: string | { toBase58(): string };
    clock_sysvar: string | { toBase58(): string };
    stake_history_sysvar: string | { toBase58(): string };
    stake_config_sysvar: string | { toBase58(): string };
  };
}

export interface Reactivate_pool_stakeParams {
  accounts: {
    vote_account: string | { toBase58(): string };
    pool: string | { toBase58(): string };
    pool_stake: string | { toBase58(): string };
    pool_stake_authority: string | { toBase58(): string };
    clock_sysvar: string | { toBase58(): string };
    stake_history_sysvar: string | { toBase58(): string };
    stake_config_sysvar: string | { toBase58(): string };
  };
}

export interface Deposit_stakeParams {
  accounts: {
    pool: string | { toBase58(): string };
    pool_stake: string | { toBase58(): string };
    pool_stake_authority: string | { toBase58(): string };
    user_stake_account: string | { toBase58(): string };
    clock_sysvar: string | { toBase58(): string };
    stake_history_sysvar: string | { toBase58(): string };
    pool_mint: string | { toBase58(): string };
    pool_mint_authority: string | { toBase58(): string };
    user_token_account: string | { toBase58(): string };
    token_program: string | { toBase58(): string };
    stake_program: string | { toBase58(): string };
  };
  args: {
    vote_account_address: string | { toBase58(): string };
  };
}

export interface Deposit_stake_quote_onlyParams {
  accounts: {
    pool: string | { toBase58(): string };
    pool_mint: string | { toBase58(): string };
    pool_mint_authority: string | { toBase58(): string };
    user_token_account: string | { toBase58(): string };
    token_program: string | { toBase58(): string };
  };
  args: {
    vote_account_address: string | { toBase58(): string };
    pool_token_supply: number | bigint;
    pre_pool_stake: number | bigint;
    stake_added: number | bigint;
  };
}

export interface Withdraw_stake_quote_onlyParams {
  accounts: {
    pool: string | { toBase58(): string };
    pool_mint: string | { toBase58(): string };
    pool_mint_authority: string | { toBase58(): string };
    user_token_account: string | { toBase58(): string };
    token_program: string | { toBase58(): string };
    user_stake_authority: string | { toBase58(): string };
  };
  args: {
    vote_account_address: string | { toBase58(): string };
    token_amount: number | bigint;
    pool_token_supply: number | bigint;
    pre_pool_stake: number | bigint;
  };
}

export interface Withdraw_stakeParams {
  accounts: {
    pool: string | { toBase58(): string };
    pool_stake: string | { toBase58(): string };
    pool_stake_authority: string | { toBase58(): string };
    pool_mint: string | { toBase58(): string };
    pool_mint_authority: string | { toBase58(): string };
    user_destination_stake: string | { toBase58(): string };
    user_stake_authority: string | { toBase58(): string };
    user_token_account: string | { toBase58(): string };
    token_program: string | { toBase58(): string };
    stake_program: string | { toBase58(): string };
    clock_sysvar: string | { toBase58(): string };
    stake_history_sysvar: string | { toBase58(): string };
  };
  args: {
    vote_account_address: string | { toBase58(): string };
    token_amount: number | bigint;
  };
}

export interface Withdraw_excess_lamportsParams {
  accounts: {
    pool: string | { toBase58(): string };
    pool_stake: string | { toBase58(): string };
    pool_stake_authority: string | { toBase58(): string };
    destination_account: string | { toBase58(): string };
    manager: string | { toBase58(): string };
    clock_sysvar: string | { toBase58(): string };
    stake_history_sysvar: string | { toBase58(): string };
  };
  args: {
    vote_account_address: string | { toBase58(): string };
    lamports: number | bigint;
  };
}

export interface Create_token_metadataParams {
  accounts: {
    pool: string | { toBase58(): string };
    pool_mint: string | { toBase58(): string };
    pool_mint_authority: string | { toBase58(): string };
    pool_mpl_authority: string | { toBase58(): string };
    manager: string | { toBase58(): string };
    metadata: string | { toBase58(): string };
    system_program_account: string | { toBase58(): string };
  };
  args: {
    vote_account_address: string | { toBase58(): string };
    name: any;
    symbol: any;
    uri: any;
  };
}

export interface Update_token_metadataParams {
  accounts: {
    pool: string | { toBase58(): string };
    pool_mpl_authority: string | { toBase58(): string };
    manager: string | { toBase58(): string };
    metadata: string | { toBase58(): string };
  };
  args: {
    vote_account_address: string | { toBase58(): string };
    name: any;
    symbol: any;
    uri: any;
  };
}
