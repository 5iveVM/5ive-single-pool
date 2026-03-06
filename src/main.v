use std::interfaces::spl_token;

interface StakeProgram @program("Stake11111111111111111111111111111111111111") @serializer("raw") {
    delegate_stake @discriminator_bytes([2, 0, 0, 0]) (
        stake_account: account @mut,
        vote_account: account,
        clock_sysvar: account,
        stake_history_sysvar: account,
        stake_config_sysvar: account,
        authority: account @authority
    );

    split @discriminator_bytes([3, 0, 0, 0]) (
        source_stake_account: account @mut,
        destination_stake_account: account @mut,
        authority: account @authority,
        lamports: u64
    );

    withdraw @discriminator_bytes([4, 0, 0, 0]) (
        stake_account: account @mut,
        destination_account: account @mut,
        authority: account @authority,
        clock_sysvar: account,
        stake_history_sysvar: account,
        lamports: u64
    );

    merge @discriminator_bytes([7, 0, 0, 0]) (
        destination_stake_account: account @mut,
        source_stake_account: account @mut,
        clock_sysvar: account,
        stake_history_sysvar: account,
        authority: account @authority
    );

    authorize_checked @discriminator_bytes([10, 0, 0, 0]) (
        stake_account: account @mut,
        clock_sysvar: account,
        authority: account @authority,
        new_authority: account @authority,
        stake_authorize_kind: u32
    );
}

// Flattened raw layout matching the inlined MPL token-metadata encoding used by SPL.
interface MetadataProgram @program("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s") @serializer("raw") {
    create_metadata_account_v3 @discriminator_bytes([33]) (
        metadata: account,
        mint: account,
        mint_authority: account @authority,
        payer: account @authority,
        update_authority: account @authority,
        system_program_account: account,
        name: string<32>,
        symbol: string<10>,
        uri: string<200>,
        seller_fee_basis_points: u16,
        creators_is_some: bool,
        collection_is_some: bool,
        uses_is_some: bool,
        is_mutable: bool,
        collection_details_is_some: bool
    );

    update_metadata_account_v2 @discriminator_bytes([15]) (
        metadata: account,
        update_authority: account @authority,
        data_is_some: bool,
        name: string<32>,
        symbol: string<10>,
        uri: string<200>,
        seller_fee_basis_points: u16,
        creators_is_some: bool,
        collection_is_some: bool,
        uses_is_some: bool,
        new_update_authority_is_some: bool,
        new_update_authority: pubkey,
        primary_sale_happened_is_some: bool,
        primary_sale_happened: bool,
        is_mutable_is_some: bool,
        is_mutable: bool
    );
}

account SinglePoolState {
    account_type: u8;
    vote_account_address: pubkey;
    manager: pubkey;
    pool_stake_address: pubkey;
    pool_mint_address: pubkey;
    pool_stake_authority_address: pubkey;
    pool_mint_authority_address: pubkey;
    metadata_initialized: bool;
    lp_supply: u64;
}

pub account_type_uninitialized() -> u8 {
    return 0;
}

pub account_type_pool() -> u8 {
    return 1;
}

pub mint_decimals() -> u8 {
    return 9;
}

pub require_distinct(a: pubkey, b: pubkey) {
    require(a != b);
}

pub stake_authorize_staker() -> u32 {
    return 0;
}

pub stake_authorize_withdrawer() -> u32 {
    return 1;
}

pub derive_pool(vote_account_address: pubkey) -> (pubkey, u8) {
    return derive_pda("pool", vote_account_address);
}

pub derive_pool_stake(pool_address: pubkey) -> (pubkey, u8) {
    return derive_pda("stake", pool_address);
}

pub derive_pool_mint(pool_address: pubkey) -> (pubkey, u8) {
    return derive_pda("mint", pool_address);
}

pub derive_pool_stake_authority(pool_address: pubkey) -> (pubkey, u8) {
    return derive_pda("stake_authority", pool_address);
}

pub derive_pool_mint_authority(pool_address: pubkey) -> (pubkey, u8) {
    return derive_pda("mint_authority", pool_address);
}

pub derive_pool_mpl_authority(pool_address: pubkey) -> (pubkey, u8) {
    return derive_pda("mpl_authority", pool_address);
}

pub quote_deposit_pool_tokens(
    pre_token_supply: u64,
    pre_pool_stake: u64,
    user_stake_to_deposit: u64
) -> u64 {
    if (pre_pool_stake == 0 || pre_token_supply == 0) {
        return user_stake_to_deposit;
    }

    return (user_stake_to_deposit * pre_token_supply) / pre_pool_stake;
}

pub quote_withdraw_stake(
    pre_token_supply: u64,
    pre_pool_stake: u64,
    user_tokens_to_burn: u64
) -> u64 {
    if (pre_token_supply == 0) {
        return 0;
    }

    let numerator: u64 = user_tokens_to_burn * pre_pool_stake;
    if (numerator < pre_token_supply) {
        return 0;
    }

    return numerator / pre_token_supply;
}

pub initialize_pool(
    pool: SinglePoolState @mut @init(payer=payer, space=240, seeds=["pool", vote_account.ctx.key]),
    payer: account @mut @signer,
    vote_account: account,
    pool_stake: account,
    pool_mint: account,
    pool_stake_authority: account @pda(seeds=["stake_authority", pool]),
    pool_mint_authority: account @pda(seeds=["mint_authority", pool])
) -> u8 {
    require_distinct(payer.ctx.key, vote_account.ctx.key);
    require_distinct(pool.ctx.key, payer.ctx.key);
    require_distinct(pool.ctx.key, vote_account.ctx.key);
    require_distinct(pool.ctx.key, pool_stake.ctx.key);
    require_distinct(pool.ctx.key, pool_mint.ctx.key);
    require_distinct(pool.ctx.key, pool_stake_authority.ctx.key);
    require_distinct(pool.ctx.key, pool_mint_authority.ctx.key);
    require_distinct(pool_stake.ctx.key, pool_mint.ctx.key);
    require_distinct(pool_stake.ctx.key, pool_stake_authority.ctx.key);
    require_distinct(pool_stake.ctx.key, pool_mint_authority.ctx.key);
    require_distinct(pool_mint.ctx.key, pool_stake_authority.ctx.key);
    require_distinct(pool_mint.ctx.key, pool_mint_authority.ctx.key);
    require_distinct(pool_stake_authority.ctx.key, pool_mint_authority.ctx.key);

    pool.account_type = account_type_pool();
    pool.vote_account_address = vote_account.ctx.key;
    pool.manager = payer.ctx.key;
    pool.pool_stake_address = pool_stake.ctx.key;
    pool.pool_mint_address = pool_mint.ctx.key;
    pool.pool_stake_authority_address = pool_stake_authority.ctx.key;
    pool.pool_mint_authority_address = pool_mint_authority.ctx.key;
    pool.metadata_initialized = false;
    pool.lp_supply = 0;
    return pool.account_type;
}

pub reactivate_pool_stake(
    vote_account: account,
    pool: SinglePoolState @pda(seeds=["pool", vote_account.ctx.key]),
    pool_stake: account @mut,
    pool_stake_authority: account @pda(seeds=["stake_authority", pool]),
    clock_sysvar: account,
    stake_history_sysvar: account,
    stake_config_sysvar: account
) {
    require(pool.account_type == account_type_pool());
    require(pool.vote_account_address == vote_account.ctx.key);

    StakeProgram::delegate_stake(
        pool_stake,
        vote_account,
        clock_sysvar,
        stake_history_sysvar,
        stake_config_sysvar,
        pool_stake_authority
    );
}

pub deposit_stake(
    vote_account_address: pubkey,
    pool: SinglePoolState @mut @pda(seeds=["pool", vote_account_address]),
    pool_stake: account @mut,
    pool_stake_authority: account @pda(seeds=["stake_authority", pool]),
    user_stake_account: account @mut,
    clock_sysvar: account,
    stake_history_sysvar: account,
    pool_mint: spl_token::Mint @mut @serializer("raw"),
    pool_mint_authority: account @pda(seeds=["mint_authority", pool]),
    user_token_account: spl_token::TokenAccount @mut @serializer("raw"),
    token_program: account,
    stake_program: account
) -> u64 {
    require(pool.account_type == account_type_pool());
    require(pool.vote_account_address == vote_account_address);
    require(pool.pool_stake_address == pool_stake.ctx.key);
    require(pool.pool_mint_address == pool_mint.ctx.key);
    require(pool.pool_stake_authority_address == pool_stake_authority.ctx.key);
    require(pool.pool_mint_authority_address == pool_mint_authority.ctx.key);
    require_distinct(pool_stake.ctx.key, user_stake_account.ctx.key);
    require_distinct(pool_stake.ctx.key, pool_mint.ctx.key);
    require_distinct(pool_stake.ctx.key, pool_mint_authority.ctx.key);
    require_distinct(pool_stake.ctx.key, user_token_account.ctx.key);
    require_distinct(pool_stake.ctx.key, pool_stake_authority.ctx.key);
    require_distinct(pool_mint.ctx.key, pool_mint_authority.ctx.key);
    require_distinct(pool_mint.ctx.key, user_token_account.ctx.key);
    require_distinct(pool_mint_authority.ctx.key, user_token_account.ctx.key);
    require_distinct(user_stake_account.ctx.key, pool_mint.ctx.key);
    require_distinct(user_stake_account.ctx.key, pool_mint_authority.ctx.key);
    require_distinct(user_stake_account.ctx.key, pool_stake_authority.ctx.key);
    require(user_token_account.mint == pool_mint.ctx.key);
    let pre_pool_stake: u64 = pool_stake.ctx.lamports;
    let stake_added: u64 = user_stake_account.ctx.lamports;
    require(stake_added > 0);

    // Merge user stake account into the pool stake account under pool authority.
    StakeProgram::merge(
        pool_stake,
        user_stake_account,
        clock_sysvar,
        stake_history_sysvar,
        pool_stake_authority
    );

    let new_pool_tokens = quote_deposit_pool_tokens(pool.lp_supply, pre_pool_stake, stake_added);
    require(new_pool_tokens > 0);

    spl_token::SPLToken::mint_to(pool_mint, user_token_account, pool_mint_authority, new_pool_tokens);
    pool.lp_supply = pool.lp_supply + new_pool_tokens;
    return new_pool_tokens;
}

deposit_stake_quote_only(
    vote_account_address: pubkey,
    pool: SinglePoolState @pda(seeds=["pool", vote_account_address]),
    pool_mint: spl_token::Mint @mut @serializer("raw"),
    pool_mint_authority: account @pda(seeds=["mint_authority", pool]),
    user_token_account: spl_token::TokenAccount @mut @serializer("raw"),
    token_program: account,
    pool_token_supply: u64,
    pre_pool_stake: u64,
    stake_added: u64
) -> u64 {
    require(pool.account_type == account_type_pool());
    require(pool.vote_account_address == vote_account_address);
    require(pool.pool_mint_address == pool_mint.ctx.key);
    require(pool.pool_mint_authority_address == pool_mint_authority.ctx.key);
    require_distinct(pool_mint.ctx.key, pool_mint_authority.ctx.key);
    require_distinct(pool_mint.ctx.key, user_token_account.ctx.key);
    require_distinct(pool_mint_authority.ctx.key, user_token_account.ctx.key);
    require(stake_added > 0);

    let new_pool_tokens = quote_deposit_pool_tokens(pool_token_supply, pre_pool_stake, stake_added);
    require(new_pool_tokens > 0);

    spl_token::SPLToken::mint_to(pool_mint, user_token_account, pool_mint_authority, new_pool_tokens);
    return new_pool_tokens;
}

withdraw_stake_quote_only(
    vote_account_address: pubkey,
    pool: SinglePoolState @pda(seeds=["pool", vote_account_address]),
    pool_mint: spl_token::Mint @mut @serializer("raw"),
    pool_mint_authority: account @pda(seeds=["mint_authority", pool]),
    user_token_account: spl_token::TokenAccount @mut @serializer("raw"),
    token_program: account,
    user_stake_authority: account @signer,
    token_amount: u64,
    pool_token_supply: u64,
    pre_pool_stake: u64
) -> u64 {
    require(pool.account_type == account_type_pool());
    require(pool.vote_account_address == vote_account_address);
    require(pool.pool_mint_address == pool_mint.ctx.key);
    require(pool.pool_mint_authority_address == pool_mint_authority.ctx.key);
    require_distinct(user_stake_authority.ctx.key, pool.ctx.key);
    require_distinct(pool_mint.ctx.key, pool_mint_authority.ctx.key);
    require_distinct(pool_mint.ctx.key, user_token_account.ctx.key);
    require_distinct(pool_mint_authority.ctx.key, user_token_account.ctx.key);
    require(pool_token_supply > 0);
    require(token_amount <= pool_token_supply);
    require(token_amount > 0);

    let withdraw_amount = quote_withdraw_stake(pool_token_supply, pre_pool_stake, token_amount);
    require(withdraw_amount > 0);
    require(withdraw_amount <= pre_pool_stake);

    spl_token::SPLToken::burn(user_token_account, pool_mint, user_stake_authority, token_amount);
    return withdraw_amount;
}

pub withdraw_stake(
    vote_account_address: pubkey,
    pool: SinglePoolState @mut @pda(seeds=["pool", vote_account_address]),
    pool_stake: account @mut,
    pool_stake_authority: account @pda(seeds=["stake_authority", pool]),
    pool_mint: spl_token::Mint @mut @serializer("raw"),
    pool_mint_authority: account @pda(seeds=["mint_authority", pool]),
    user_destination_stake: account @mut,
    user_stake_authority: account @signer,
    user_token_account: spl_token::TokenAccount @mut @serializer("raw"),
    token_program: account,
    stake_program: account,
    clock_sysvar: account,
    stake_history_sysvar: account,
    token_amount: u64
) -> u64 {
    require(pool.account_type == account_type_pool());
    require(pool.vote_account_address == vote_account_address);
    require(pool.pool_stake_address == pool_stake.ctx.key);
    require(pool.pool_mint_address == pool_mint.ctx.key);
    require(pool.pool_stake_authority_address == pool_stake_authority.ctx.key);
    require(pool.pool_mint_authority_address == pool_mint_authority.ctx.key);
    require_distinct(user_stake_authority.ctx.key, pool.ctx.key);
    require_distinct(pool_stake.ctx.key, user_destination_stake.ctx.key);
    require_distinct(pool_stake.ctx.key, pool_stake_authority.ctx.key);
    require_distinct(pool_stake.ctx.key, pool_mint.ctx.key);
    require_distinct(pool_stake.ctx.key, pool_mint_authority.ctx.key);
    require_distinct(pool_stake.ctx.key, user_token_account.ctx.key);
    require_distinct(pool_mint.ctx.key, pool_mint_authority.ctx.key);
    require_distinct(pool_mint.ctx.key, user_token_account.ctx.key);
    require_distinct(pool_mint_authority.ctx.key, user_token_account.ctx.key);
    require_distinct(user_destination_stake.ctx.key, pool_mint.ctx.key);
    require_distinct(user_destination_stake.ctx.key, pool_mint_authority.ctx.key);
    require_distinct(user_destination_stake.ctx.key, pool_stake_authority.ctx.key);
    require_distinct(user_destination_stake.ctx.key, user_stake_authority.ctx.key);
    require(user_token_account.mint == pool_mint.ctx.key);
    let pre_pool_stake: u64 = pool_stake.ctx.lamports;
    require(pool.lp_supply > 0);
    require(token_amount <= pool.lp_supply);
    require(token_amount > 0);

    let withdraw_amount = quote_withdraw_stake(pool.lp_supply, pre_pool_stake, token_amount);
    require(withdraw_amount > 0);
    require(withdraw_amount <= pre_pool_stake);

    spl_token::SPLToken::burn(user_token_account, pool_mint, user_stake_authority, token_amount);

    // Split pooled stake into user-provided stake account.
    StakeProgram::split(
        pool_stake,
        user_destination_stake,
        pool_stake_authority,
        withdraw_amount
    );

    // Re-authorize resulting stake account to the user's authority.
    // Use u32 literals directly so interface serialization emits exact 4-byte kinds.
    StakeProgram::authorize_checked(
        user_destination_stake,
        clock_sysvar,
        pool_stake_authority,
        user_stake_authority,
        stake_authorize_staker()
    );
    StakeProgram::authorize_checked(
        user_destination_stake,
        clock_sysvar,
        pool_stake_authority,
        user_stake_authority,
        stake_authorize_withdrawer()
    );

    pool.lp_supply = pool.lp_supply - token_amount;
    return withdraw_amount;
}

pub withdraw_excess_lamports(
    vote_account_address: pubkey,
    pool: SinglePoolState @pda(seeds=["pool", vote_account_address]) @has(manager),
    pool_stake: account @mut,
    pool_stake_authority: account @pda(seeds=["stake_authority", pool]),
    destination_account: account @mut,
    manager: account @signer,
    clock_sysvar: account,
    stake_history_sysvar: account,
    lamports: u64
) -> bool {
    require(pool.account_type == account_type_pool());
    require(pool.vote_account_address == vote_account_address);
    require(pool.pool_stake_address == pool_stake.ctx.key);
    require(pool.pool_stake_authority_address == pool_stake_authority.ctx.key);
    require_distinct(manager.ctx.key, destination_account.ctx.key);
    require_distinct(manager.ctx.key, pool_stake.ctx.key);
    require_distinct(manager.ctx.key, pool_stake_authority.ctx.key);
    require_distinct(destination_account.ctx.key, pool.ctx.key);
    require_distinct(destination_account.ctx.key, pool_stake.ctx.key);
    require_distinct(destination_account.ctx.key, pool_stake_authority.ctx.key);
    require(lamports > 0);

    StakeProgram::withdraw(
        pool_stake,
        destination_account,
        pool_stake_authority,
        clock_sysvar,
        stake_history_sysvar,
        lamports
    );
    return true;
}

pub create_token_metadata(
    vote_account_address: pubkey,
    pool: SinglePoolState @mut @pda(seeds=["pool", vote_account_address]) @has(manager),
    pool_mint: account,
    pool_mint_authority: account @pda(seeds=["mint_authority", pool]),
    pool_mpl_authority: account @pda(seeds=["mpl_authority", pool]),
    manager: account @signer,
    metadata: account @mut,
    system_program_account: account,
    name: string<32>,
    symbol: string<10>,
    uri: string<200>
) -> bool {
    require(pool.account_type == account_type_pool());
    require(pool.vote_account_address == vote_account_address);
    require(pool.pool_mint_address == pool_mint.ctx.key);
    require(pool.pool_mint_authority_address == pool_mint_authority.ctx.key);
    require(!pool.metadata_initialized);
    require_distinct(manager.ctx.key, metadata.ctx.key);
    require_distinct(metadata.ctx.key, pool_mint.ctx.key);
    require_distinct(pool_mpl_authority.ctx.key, metadata.ctx.key);
    require_distinct(pool_mint_authority.ctx.key, pool_mpl_authority.ctx.key);
    require_distinct(pool_mint_authority.ctx.key, metadata.ctx.key);
    require_distinct(manager.ctx.key, pool_mint.ctx.key);
    require_distinct(manager.ctx.key, pool_mpl_authority.ctx.key);
    require(name != "");
    require(symbol != "");
    require(uri != "");

    pool.metadata_initialized = true;
    return true;
}

pub update_token_metadata(
    vote_account_address: pubkey,
    pool: SinglePoolState @mut @pda(seeds=["pool", vote_account_address]) @has(manager),
    pool_mpl_authority: account @pda(seeds=["mpl_authority", pool]),
    manager: account @signer,
    metadata: account,
    name: string<32>,
    symbol: string<10>,
    uri: string<200>
) -> bool {
    require(pool.account_type == account_type_pool());
    require(pool.vote_account_address == vote_account_address);
    require(pool.metadata_initialized);
    require_distinct(pool_mpl_authority.ctx.key, metadata.ctx.key);
    require_distinct(manager.ctx.key, pool.ctx.key);
    require_distinct(metadata.ctx.key, pool.ctx.key);
    require_distinct(manager.ctx.key, metadata.ctx.key);
    require_distinct(manager.ctx.key, pool_mpl_authority.ctx.key);
    require(name != "");
    require(symbol != "");
    require(uri != "");
    return true;
}
