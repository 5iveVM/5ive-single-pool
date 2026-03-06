# Repros

These files isolate compiler and VM issues encountered while building the `single-pool` port.

## `derive_pda_stateful_failure.v`

Purpose:

- Demonstrates that `derive_pda(...)` is valid in a pure helper.
- Demonstrates that typed `@init` state is valid without PDA derivation in the instruction body.
- Demonstrates the failing combination in the affected toolchain: tuple destructuring of a tuple-returning value inside a stateful instruction that uses typed state.
- `derive_pda(...)` is just one trigger because it returns `(pubkey, u8)`.

Expected behavior:

- `derive_only(...)` should compile.
- `init_without_derive(...)` should compile.
- `init_with_derive(...)` should also compile, but this is the shape that exposed the tuple-destructuring bytecode generation bug in the installed toolchain.

This gives the compiler/VM agent a narrow repro target instead of requiring the full `single-pool` project to trigger the issue.
