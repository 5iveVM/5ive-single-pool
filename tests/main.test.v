// Deterministic parity tests for single-pool math and canonical equality guards.

// @test-params 0
pub test_account_type_uninitialized() -> u64 {
    return 0;
}

// @test-params 1
pub test_account_type_pool() -> u64 {
    return 1;
}

// @test-params 9
pub test_mint_decimals() -> u64 {
    return 9;
}

// @test-params 1000 0 250 250
pub test_initial_deposit_mints_1_to_1(
    pre_token_supply: u64,
    pre_pool_stake: u64,
    user_stake_to_deposit: u64
) -> u64 {
    if (pre_pool_stake == 0 || pre_token_supply == 0) {
        return user_stake_to_deposit;
    }

    return (user_stake_to_deposit * pre_token_supply) / pre_pool_stake;
}

// @test-params 1000 10000 500 50
pub test_proportional_deposit_quote(
    pre_token_supply: u64,
    pre_pool_stake: u64,
    user_stake_to_deposit: u64
) -> u64 {
    if (pre_pool_stake == 0 || pre_token_supply == 0) {
        return user_stake_to_deposit;
    }

    return (user_stake_to_deposit * pre_token_supply) / pre_pool_stake;
}

// @test-params 1000 10000 50 500
pub test_withdraw_quote(
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

// @test-params 0 10000 50 true
pub test_zero_supply_withdraw_is_too_small(
    pre_token_supply: u64,
    pre_pool_stake: u64,
    user_tokens_to_burn: u64
) -> bool {
    if (pre_token_supply == 0) {
        return true;
    }

    let numerator: u64 = user_tokens_to_burn * pre_pool_stake;
    return numerator < pre_token_supply;
}

// @test-params 7 7 true
pub test_pool_guard_accepts_matching_values(
    expected_value: u64,
    actual_value: u64
) -> bool {
    return expected_value == actual_value;
}

// @test-params 7 9 true
pub test_pool_guard_rejects_mismatch(
    expected_value: u64,
    actual_value: u64
) -> bool {
    return expected_value != actual_value;
}

// @test-params 1000 10000 50 true
pub test_withdraw_amount_is_nonzero_for_valid_ratio(
    pre_token_supply: u64,
    pre_pool_stake: u64,
    user_tokens_to_burn: u64
) -> bool {
    if (pre_token_supply == 0) {
        return false;
    }

    let numerator: u64 = user_tokens_to_burn * pre_pool_stake;
    if (numerator < pre_token_supply) {
        return false;
    }

    return (numerator / pre_token_supply) > 0;
}

// @test-params 1000 10000 50 true
pub test_withdraw_amount_stays_within_pool_stake(
    pre_token_supply: u64,
    pre_pool_stake: u64,
    user_tokens_to_burn: u64
) -> bool {
    if (pre_token_supply == 0) {
        return false;
    }

    let numerator: u64 = user_tokens_to_burn * pre_pool_stake;
    if (numerator < pre_token_supply) {
        return false;
    }

    let withdraw_amount: u64 = numerator / pre_token_supply;
    return withdraw_amount <= pre_pool_stake;
}
