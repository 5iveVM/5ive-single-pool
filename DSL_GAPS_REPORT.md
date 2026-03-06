# 5IVE DSL / VM Gap Report

This file captures the concrete compiler and runtime surface gaps encountered while pushing the SPL `single-pool` port toward a fuller 5IVE implementation.

## Blocking Gaps

### 1. Tuple destructuring / `derive_pda(...)` fix needs rollout validation

Observed behavior:

- This project was originally blocked by tuple-destructuring bytecode issues when `derive_pda(...)` was used inside stateful instructions.
- Another agent has reportedly fixed that path upstream, but the installed global toolchain in this environment has not been refreshed to validate it here end-to-end.
- The port has now been refactored to use seeded `@init(...)` and `@pda(seeds=[...])` constraints, so it no longer depends on this path for correctness.

Impact:

- If the fix is not actually present in the deployed CLI/runtime path, developers can still hit regressions when using direct `derive_pda(...)` plus tuple destructuring in stateful code.
- This remains a valid first-class pattern and should be verified independently of this port.

Requested feature/fix:

- Confirm the upstream fix in the globally installed CLI/runtime path.
- Keep regression coverage so tuple-returning values, including `derive_pda(...)`, remain usable in `require(...)` checks and CPI signer flows.

Repro artifact:

- [repros/derive_pda_stateful_failure.v](/Users/ivmidable/Development/five-mono/5ive-single-pool/repros/derive_pda_stateful_failure.v)

### 2. Metadata CPI with bounded strings is not currently practical

Observed behavior:

- This port now handles metadata natively in `SinglePoolState` and keeps the public metadata instructions fully functional.
- A local `MetadataProgram` interface with the flattened Metaplex raw layout compiles successfully.
- Emitting the actual call through that interface still hits compiler/type issues at the string-bearing call site.

Impact:

- The user-facing metadata feature is present, but it is implemented as 5IVE-native state rather than external Metaplex metadata.
- The contract is now pre-wired with the correct local interface surface, but projects that specifically require Metaplex-compatible metadata accounts still need additional compiler/runtime support before the call can be enabled.

Requested feature/fix:

- Improve interface serialization and codegen for CPI calls that include bounded `string<N>` arguments.
- Validate support for mixed account + string payloads in raw or structured serializers.

### 3. Checked SPL token variants are still toolchain-inconsistent

Observed behavior:

- `spl_token::mint_to` and `spl_token::burn` compile and are usable in the repo-local toolchain.
- Attempting `mint_to_checked` / `burn_checked` produced inconsistent results: one installed binary accepted them, while the repo-local CLI failed ABI generation with `InvalidParameterCount`.

Impact:

- The current port uses un-checked token CPIs rather than the stricter checked variants that better mirror mint-decimal-aware SPL behavior.

Requested feature/fix:

- Align interface/ABI generation for SPL instructions that include the extra `decimals: u8` argument.
- Ensure checked token CPIs behave consistently across the global install and repo-local toolchain.

### 4. Top-level `const` declarations are not supported

Observed behavior:

- `pub const X: u8 = 1;` fails syntax parsing.

Impact:

- Stable invariants like `ACCOUNT_TYPE_POOL` and `MINT_DECIMALS` must be encoded as zero-argument helper functions instead of constants.

Requested feature/fix:

- Add top-level immutable constant declarations for primitive types.

### 5. Legacy non-SDK test discovery disagrees with SDK-runner suites

Observed behavior:

- `node ../five-cli/dist/index.js test --sdk-runner` executes the JSON-defined suite successfully.
- `5ive test --filter "test_*" --verbose` reports no tests found in the same project state.

Impact:

- The documented two-path test workflow is not equivalent in practice.
- This makes regression reporting ambiguous for projects that rely on SDK-runner suites.

Requested feature/fix:

- Align legacy test discovery with SDK-runner suite definitions, or make the CLI clearly report the supported test modes and what inputs they require.

## Non-Blocking Notes

- Typed `account` declarations, `@init`, and local interfaces are usable in this project as long as the instruction bodies avoid the failing patterns above.
- Raw CPI for stake delegation is viable with explicit discriminator bytes.
- The remaining missing surface is narrow enough to be a compiler/VM follow-up task, not a project-structure issue.
