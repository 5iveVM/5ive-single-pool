#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ============================================================================
# CONFIG
# ============================================================================

export FIVE_NETWORK="${FIVE_NETWORK:-localnet}"
export FIVE_RPC_URL="${FIVE_RPC_URL:-http://127.0.0.1:8899}"
export FIVE_KEYPAIR_PATH="${FIVE_KEYPAIR_PATH:-$HOME/.config/solana/id.json}"
export FIVE_PROGRAM_ID="${FIVE_PROGRAM_ID:-5ive58PJUPaTyAe7tvU1bvBi25o7oieLLTRsJDoQNJst}"

echo "============================================================================"
echo "5ive Single-Pool E2E Test Suite"
echo "============================================================================"

# ============================================================================
# STEP 1: Check localnet
# ============================================================================

echo ""
echo "Checking localnet..."
if ! solana cluster-version --url "$FIVE_RPC_URL" &>/dev/null; then
    echo "❌ localnet not running at $FIVE_RPC_URL"
    echo "Start with: solana-test-validator"
    exit 1
fi
echo "✅ localnet is running"

# ============================================================================
# STEP 2: Build contract
# ============================================================================

echo ""
echo "Building contract..."
if ! five build; then
    echo "❌ Contract build failed"
    exit 1
fi
echo "✅ Contract built"

# ============================================================================
# STEP 3: Deploy if needed
# ============================================================================

echo ""
if [ -z "$FIVE_SINGLE_POOL_SCRIPT_ACCOUNT" ]; then
    echo "Deploying contract..."
    DEPLOY_OUTPUT=$(five deploy build/main.five \
        --program-id "$FIVE_PROGRAM_ID" \
        --keypair "$FIVE_KEYPAIR_PATH" \
        --rpc-url "$FIVE_RPC_URL" 2>&1)

    echo "$DEPLOY_OUTPUT"

    # Try to extract script account from output
    SCRIPT_ACCOUNT=$(echo "$DEPLOY_OUTPUT" | grep -oP 'Script account: \K\S+' || \
                     echo "$DEPLOY_OUTPUT" | grep -oP 'script_account.*?:\s*\K\S+' || true)

    if [ -z "$SCRIPT_ACCOUNT" ]; then
        echo "❌ Could not extract script account from deployment output"
        echo "Deploy manually with: five deploy build/main.five"
        exit 1
    fi

    export FIVE_SINGLE_POOL_SCRIPT_ACCOUNT="$SCRIPT_ACCOUNT"
    echo "✅ Contract deployed: $FIVE_SINGLE_POOL_SCRIPT_ACCOUNT"
else
    echo "Using existing script account: $FIVE_SINGLE_POOL_SCRIPT_ACCOUNT"
fi

# ============================================================================
# STEP 4: Setup (initialize pool)
# ============================================================================

echo ""
echo "Running setup..."
if ! node e2e-setup.mjs; then
    echo "❌ Setup failed"
    exit 1
fi
echo "✅ Setup complete"

# ============================================================================
# STEP 5: Run tests
# ============================================================================

echo ""
echo "Running E2E tests..."
if ! node e2e-single-pool-test.mjs; then
    echo "❌ Tests failed"
    exit 1
fi
echo "✅ Tests passed"

# ============================================================================
# DONE
# ============================================================================

echo ""
echo "============================================================================"
echo "✅ All E2E tests passed!"
echo "============================================================================"
