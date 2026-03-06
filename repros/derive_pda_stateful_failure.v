account ReproState {
    value: u64;
}

pub derive_only(authority: pubkey) -> (pubkey, u8) {
    return derive_pda("repro", authority);
}

pub init_without_derive(
    state: ReproState @mut @init(payer=payer, space=32) @signer,
    payer: account @mut @signer
) -> u64 {
    state.value = 1;
    return state.value;
}

pub init_with_derive(
    state: ReproState @mut @init(payer=payer, space=32) @signer,
    payer: account @mut @signer,
    authority: pubkey
) -> bool {
    let (expected, _bump) = derive_pda("repro", authority);
    require(state.ctx.key == expected);
    state.value = 1;
    return true;
}
