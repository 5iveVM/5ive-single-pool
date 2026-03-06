# 5IVE Single Pool

This project is the current best-effort 5IVE port of SPL `single-pool` from:

- `solana-program-library/single-pool/program` (upstream SPL source)

## Current Port Status

The contract in [src/main.v](/Users/ivmidable/Development/five-mono/5ive-single-pool/src/main.v) is now a stateful partial port rather than the earlier arithmetic-only scaffold:

- It defines a typed `SinglePoolState` account with the same minimal persistent fields as upstream.
- It preserves the six upstream public instruction names.
- It implements the core deposit and withdraw math.
- It performs live CPI for stake reactivation and SPL token mint/burn.
- It uses seeded `@init(...)` and `@pda(seeds=[...])` constraints for canonical pool, mint, and authority validation instead of pushing expected PDA pubkeys through the ABI.
- It implements `create_token_metadata` and `update_token_metadata` as real, stateful metadata management on the pool account, guarded by a stored manager authority via `@has(manager)`.
- It includes a local `MetadataProgram` interface for Metaplex token-metadata CPI, with the raw field layout flattened to match SPL's inlined encoding.
- It stores canonical pool stake/mint and authority addresses in `SinglePoolState` and enforces them across deposit/withdraw flows.
- It applies strict anti-aliasing guards across account inputs for pool instructions.

The remaining gaps are in the DSL/compiler and VM surface, not in the project structure.

## Current Limits

- The port is now constraint-first, but direct in-body `derive_pda(...)` remains worth validating after your global CLI picks up the upstream fix.
- The port now has fully functional native metadata management, and a local Metaplex interface is present, but the current compiler still rejects the actual string-bearing Metaplex call site.
- Checked SPL token variants such as `mint_to_checked` and `burn_checked` are still inconsistent across toolchains, so the stable path remains plain `mint_to` and `burn`.
- Legacy non-SDK test discovery does not find the same tests the SDK runner executes.

Those issues are recorded in [DSL_GAPS_REPORT.md](/Users/ivmidable/Development/five-mono/5ive-single-pool/DSL_GAPS_REPORT.md) so another agent can address the DSL/VM side directly.

## Commands

```bash
cd /Users/ivmidable/Development/five-mono/5ive-single-pool
node ../five-cli/dist/index.js build --project .
node ../five-cli/dist/index.js test --sdk-runner
node ../five-cli/dist/index.js test --filter "test_*" --verbose
node ./client/compare-cu.mjs
npm --prefix client run flow:local
```

## File Map

- [src/main.v](/Users/ivmidable/Development/five-mono/5ive-single-pool/src/main.v): stateful contract and partial CPI port
- [tests/main.test.v](/Users/ivmidable/Development/five-mono/5ive-single-pool/tests/main.test.v): deterministic helper tests
- [client/scenarios.mjs](/Users/ivmidable/Development/five-mono/5ive-single-pool/client/scenarios.mjs): ABI-aligned scenario definitions
- [client/setup-single-pool.mjs](/Users/ivmidable/Development/five-mono/5ive-single-pool/client/setup-single-pool.mjs): local setup scaffold
- [client/create-and-delegate-user-stake.mjs](/Users/ivmidable/Development/five-mono/5ive-single-pool/client/create-and-delegate-user-stake.mjs): deposit-account helper scaffold
- [run-localnet-lst-flow.mjs](/Users/ivmidable/Development/five-mono/5ive-single-pool/client/run-localnet-lst-flow.mjs): localnet initialize/deposit/withdraw flow with token-delta checks (currently blocked by runtime init/PDA signer behavior on this VM build)
- [client/run-five-flow.mjs](/Users/ivmidable/Development/five-mono/5ive-single-pool/client/run-five-flow.mjs): 5IVE-side flow scaffold
- [client/run-spl-flow.mjs](/Users/ivmidable/Development/five-mono/5ive-single-pool/client/run-spl-flow.mjs): SPL-side flow scaffold
- [client/compare-cu.mjs](/Users/ivmidable/Development/five-mono/5ive-single-pool/client/compare-cu.mjs): CU report writer
- [runtime-fixtures/initialize_pool.json](/Users/ivmidable/Development/five-mono/5ive-single-pool/runtime-fixtures/initialize_pool.json): ABI-aligned initialize fixture
- [runtime-fixtures/deposit_stake.json](/Users/ivmidable/Development/five-mono/5ive-single-pool/runtime-fixtures/deposit_stake.json): ABI-aligned deposit fixture
- [runtime-fixtures/withdraw_stake.json](/Users/ivmidable/Development/five-mono/5ive-single-pool/runtime-fixtures/withdraw_stake.json): ABI-aligned withdraw fixture
- [runtime-fixtures/reactivate_pool_stake.json](/Users/ivmidable/Development/five-mono/5ive-single-pool/runtime-fixtures/reactivate_pool_stake.json): ABI-aligned reactivate fixture
- [benchmarks/results/single-pool-cu-report.json](/Users/ivmidable/Development/five-mono/5ive-single-pool/benchmarks/results/single-pool-cu-report.json): CU comparison scaffold output
