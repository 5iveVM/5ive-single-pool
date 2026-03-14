#!/usr/bin/env node
/**
 * Single-Pool E2E Setup
 *
 * One-time setup script that:
 * 1. Derives VM state and fee vault PDAs
 * 2. Deploys the Five script (or reuses existing)
 * 3. Creates vote account (or discovers default)
 * 4. Derives pool PDAs
 * 5. Funds and initializes pool stake
 * 6. Calls initialize_pool
 * 7. Writes test-env.json for subsequent tests
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
    Connection, Keypair, PublicKey, Transaction,
    SystemProgram, sendAndConfirmTransaction, LAMPORTS_PER_SOL,
    SYSVAR_CLOCK_PUBKEY, SYSVAR_STAKE_HISTORY_PUBKEY
} from '@solana/web3.js';
import { FiveSDK, FiveProgram } from '../../five-sdk/dist/index.js';
import { loadSdkValidatorConfig } from '../../scripts/lib/sdk-validator-config.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// CONFIG
// ============================================================================

const CFG = loadSdkValidatorConfig({
    network: process.env.FIVE_NETWORK || 'localnet',
});

let RPC_URL = CFG.rpcUrl;
const PAYER_KEYPAIR_PATH = CFG.keypairPath;
let FIVE_PROGRAM_ID = new PublicKey(CFG.programId);
let VM_STATE_PDA = CFG.vmStatePda
    ? new PublicKey(CFG.vmStatePda)
    : PublicKey.findProgramAddressSync([Buffer.from('vm_state')], FIVE_PROGRAM_ID)[0];

const FEE_VAULT_SEED_PREFIX = Buffer.from([0xff, ...Buffer.from('five_vm_fee_vault_v1')]);
const FEE_VAULT_ACCOUNT = PublicKey.findProgramAddressSync([FEE_VAULT_SEED_PREFIX, Buffer.from([0])], FIVE_PROGRAM_ID)[0];

const STAKE_PROGRAM_ID = new PublicKey('Stake11111111111111111111111111111111111111');
const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJsyFbPVwwQQfsTT');
const STAKE_CONFIG_ID = new PublicKey('StakeConfig11111111111111111111111111111111');

const TEST_ENV_FILE = path.join(__dirname, 'test-env.json');

// ============================================================================
// LOGGING
// ============================================================================

const log = (msg) => console.log(msg);
const success = (msg) => console.log(`✅ ${msg}`);
const error = (msg) => console.log(`❌ ${msg}`);
const info = (msg) => console.log(`ℹ️  ${msg}`);
const header = (msg) => console.log(`\n${'='.repeat(80)}\n${msg}\n${'='.repeat(80)}`);

// ============================================================================
// MAIN
// ============================================================================

async function main() {
    header('🚀 Single-Pool E2E Setup');

    const connection = new Connection(RPC_URL, 'confirmed');
    const secretKey = JSON.parse(fs.readFileSync(PAYER_KEYPAIR_PATH, 'utf-8'));
    const payer = Keypair.fromSecretKey(Uint8Array.from(secretKey));
    info(`Payer: ${payer.publicKey.toBase58()}`);
    info(`Five Program: ${FIVE_PROGRAM_ID.toBase58()}`);
    info(`VM State: ${VM_STATE_PDA.toBase58()}`);
    info(`Fee Vault: ${FEE_VAULT_ACCOUNT.toBase58()}`);

    // =========================================================================
    // STEP 1: Ensure payer has funds
    // =========================================================================
    header('STEP 1: Ensure Payer Funding');

    let balance = await connection.getBalance(payer.publicKey);
    info(`Payer balance: ${(balance / LAMPORTS_PER_SOL).toFixed(2)} SOL`);

    if (balance < 5 * LAMPORTS_PER_SOL) {
        info('Attempting airdrop...');
        try {
            const airdropSig = await connection.requestAirdrop(payer.publicKey, 10 * LAMPORTS_PER_SOL);
            await connection.confirmTransaction(airdropSig, 'confirmed');
            balance = await connection.getBalance(payer.publicKey);
            info(`After airdrop: ${(balance / LAMPORTS_PER_SOL).toFixed(2)} SOL`);
        } catch (e) {
            warn(`Airdrop failed: ${e.message}`);
        }
    }

    // =========================================================================
    // STEP 2: Determine Script Account and deploy if needed
    // =========================================================================
    header('STEP 2: Determine Script Account');

    let SINGLE_POOL_SCRIPT_ACCOUNT;
    if (process.env.FIVE_SINGLE_POOL_SCRIPT_ACCOUNT) {
        SINGLE_POOL_SCRIPT_ACCOUNT = new PublicKey(process.env.FIVE_SINGLE_POOL_SCRIPT_ACCOUNT);
        info(`Using existing script account: ${SINGLE_POOL_SCRIPT_ACCOUNT.toBase58()}`);
    } else {
        info('No FIVE_SINGLE_POOL_SCRIPT_ACCOUNT set; deployment expected to be done externally');
        throw new Error(
            'Missing FIVE_SINGLE_POOL_SCRIPT_ACCOUNT env var. ' +
            'Run: five deploy build/main.five and set FIVE_SINGLE_POOL_SCRIPT_ACCOUNT=<script_account>'
        );
    }

    // =========================================================================
    // STEP 3: Discover or create vote account
    // =========================================================================
    header('STEP 3: Discover Vote Account');

    let voteAccount;
    try {
        const voteAccounts = await connection.getVoteAccounts();
        if (voteAccounts.current.length > 0) {
            voteAccount = voteAccounts.current[0];
            info(`Using validator vote account: ${voteAccount.votePubkey}`);
        } else {
            throw new Error('No active vote accounts found on localnet');
        }
    } catch (e) {
        error(`Failed to discover vote account: ${e.message}`);
        throw e;
    }

    const VOTE_ACCOUNT_PUBKEY = new PublicKey(voteAccount.votePubkey);

    // =========================================================================
    // STEP 4: Derive pool PDAs
    // =========================================================================
    header('STEP 4: Derive Pool PDAs');

    const [poolPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('pool'), VOTE_ACCOUNT_PUBKEY.toBuffer()],
        FIVE_PROGRAM_ID
    );
    info(`Pool PDA: ${poolPda.toBase58()}`);

    const [poolStakePda] = PublicKey.findProgramAddressSync(
        [Buffer.from('stake'), poolPda.toBuffer()],
        FIVE_PROGRAM_ID
    );
    info(`Pool Stake PDA: ${poolStakePda.toBase58()}`);

    const [poolMintPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('mint'), poolPda.toBuffer()],
        FIVE_PROGRAM_ID
    );
    info(`Pool Mint PDA: ${poolMintPda.toBase58()}`);

    const [poolStakeAuthorityPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('stake_authority'), poolPda.toBuffer()],
        FIVE_PROGRAM_ID
    );
    info(`Pool Stake Authority PDA: ${poolStakeAuthorityPda.toBase58()}`);

    const [poolMintAuthorityPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('mint_authority'), poolPda.toBuffer()],
        FIVE_PROGRAM_ID
    );
    info(`Pool Mint Authority PDA: ${poolMintAuthorityPda.toBase58()}`);

    // =========================================================================
    // STEP 5: Fund pool_stake PDA with rent-exempt + min delegation
    // =========================================================================
    header('STEP 5: Fund Pool Stake PDA');

    const stakeAccountInfo = await connection.getAccountInfo(poolStakePda);
    const rentExempt = await connection.getMinimumBalanceForRentExemption(200);
    const minDelegation = 1 * LAMPORTS_PER_SOL; // 1 SOL minimum
    const totalRequired = rentExempt + minDelegation;

    if (!stakeAccountInfo) {
        info(`Creating stake account with ${(totalRequired / LAMPORTS_PER_SOL).toFixed(2)} SOL`);

        // Create stake account owned by Stake program
        const createStakeTx = new Transaction().add(
            SystemProgram.createAccount({
                fromPubkey: payer.publicKey,
                newAccountPubkey: poolStakePda,
                lamports: totalRequired,
                space: 200,
                programId: STAKE_PROGRAM_ID
            })
        );

        const sig = await sendAndConfirmTransaction(connection, createStakeTx, [payer], {
            skipPreflight: false,
            commitment: 'confirmed'
        });
        success(`Created stake account: ${sig}`);
    } else {
        const currentBalance = stakeAccountInfo.lamports;
        if (currentBalance < totalRequired) {
            info(`Topping up stake account: current ${(currentBalance / LAMPORTS_PER_SOL).toFixed(2)} SOL -> required ${(totalRequired / LAMPORTS_PER_SOL).toFixed(2)} SOL`);

            const topupTx = new Transaction().add(
                SystemProgram.transfer({
                    fromPubkey: payer.publicKey,
                    toPubkey: poolStakePda,
                    lamports: totalRequired - currentBalance
                })
            );

            const sig = await sendAndConfirmTransaction(connection, topupTx, [payer], {
                skipPreflight: false,
                commitment: 'confirmed'
            });
            success(`Topped up stake account: ${sig}`);
        } else {
            info(`Stake account already funded: ${(currentBalance / LAMPORTS_PER_SOL).toFixed(2)} SOL`);
        }
    }

    // =========================================================================
    // STEP 6: Call initialize_pool via FiveProgram
    // =========================================================================
    header('STEP 6: Initialize Pool');

    const SINGLE_POOL_ABI = {
        functions: [
            { name: 'account_type_uninitialized', index: 0, parameters: [] },
            { name: 'account_type_pool', index: 1, parameters: [] },
            { name: 'mint_decimals', index: 2, parameters: [] },
            { name: 'stake_authorize_staker', index: 3, parameters: [] },
            { name: 'stake_authorize_withdrawer', index: 4, parameters: [] },
            { name: 'derive_pool', index: 5, parameters: [{ name: 'vote_account_address', type: 'pubkey' }] },
            { name: 'derive_pool_stake', index: 6, parameters: [{ name: 'pool_address', type: 'pubkey' }] },
            { name: 'derive_pool_mint', index: 7, parameters: [{ name: 'pool_address', type: 'pubkey' }] },
            { name: 'derive_pool_stake_authority', index: 8, parameters: [{ name: 'pool_address', type: 'pubkey' }] },
            { name: 'derive_pool_mint_authority', index: 9, parameters: [{ name: 'pool_address', type: 'pubkey' }] },
            { name: 'quote_deposit_pool_tokens', index: 10, parameters: [
                { name: 'pre_token_supply', type: 'u64' },
                { name: 'pre_pool_stake', type: 'u64' },
                { name: 'user_stake_to_deposit', type: 'u64' }
            ]},
            {
                name: 'initialize_pool',
                index: 11,
                parameters: [
                    { name: 'pool', type: 'account', is_account: true, attributes: ['mut', 'init'] },
                    { name: 'payer', type: 'account', is_account: true, attributes: ['mut', 'signer'] },
                    { name: 'vote_account', type: 'account', is_account: true },
                    { name: 'pool_stake', type: 'account', is_account: true, attributes: ['mut'] },
                    { name: 'pool_mint', type: 'account', is_account: true },
                    { name: 'pool_stake_authority', type: 'account', is_account: true },
                    { name: 'pool_mint_authority', type: 'account', is_account: true },
                    { name: 'clock_sysvar', type: 'account', is_account: true },
                    { name: 'stake_history_sysvar', type: 'account', is_account: true },
                    { name: 'stake_config_sysvar', type: 'account', is_account: true }
                ]
            },
            { name: 'reactivate_pool_stake', index: 13, parameters: [
                { name: 'pool', type: 'account', is_account: true, attributes: ['mut'] },
                { name: 'pool_stake', type: 'account', is_account: true, attributes: ['mut'] },
                { name: 'pool_stake_authority', type: 'account', is_account: true },
                { name: 'vote_account', type: 'account', is_account: true },
                { name: 'clock_sysvar', type: 'account', is_account: true },
                { name: 'stake_history_sysvar', type: 'account', is_account: true },
                { name: 'stake_config_sysvar', type: 'account', is_account: true }
            ]},
            { name: 'deposit_stake', index: 14, parameters: [] },
            { name: 'withdraw_stake', index: 17, parameters: [] }
        ]
    };

    const program = FiveProgram.fromABI(SINGLE_POOL_SCRIPT_ACCOUNT.toBase58(), SINGLE_POOL_ABI, {
        fiveVMProgramId: FIVE_PROGRAM_ID.toBase58(),
        vmStateAccount: VM_STATE_PDA.toBase58(),
        feeReceiverAccount: payer.publicKey.toBase58(),
        debug: true
    });

    try {
        const initIx = await program
            .function('initialize_pool')
            .accounts({
                pool: poolPda,
                payer: payer.publicKey,
                vote_account: VOTE_ACCOUNT_PUBKEY,
                pool_stake: poolStakePda,
                pool_mint: poolMintPda,
                pool_stake_authority: poolStakeAuthorityPda,
                pool_mint_authority: poolMintAuthorityPda,
                clock_sysvar: SYSVAR_CLOCK_PUBKEY,
                stake_history_sysvar: SYSVAR_STAKE_HISTORY_PUBKEY,
                stake_config_sysvar: STAKE_CONFIG_ID
            })
            .payer(payer.publicKey)
            .instruction();

        // Extract keys and data for sendInstruction
        const keys = initIx.keys.map(k => ({
            pubkey: k.pubkey.toBase58(),
            isSigner: k.isSigner,
            isWritable: k.isWritable
        }));

        const tx = new Transaction().add({
            programId: new PublicKey(initIx.programId),
            keys: keys.map(k => ({
                pubkey: new PublicKey(k.pubkey),
                isSigner: k.isSigner,
                isWritable: k.isWritable
            })),
            data: Buffer.from(initIx.data, 'base64')
        });

        const sig = await sendAndConfirmTransaction(connection, tx, [payer], {
            skipPreflight: false,
            commitment: 'confirmed'
        });

        success(`initialize_pool succeeded: ${sig}`);
    } catch (e) {
        error(`initialize_pool failed: ${e.message}`);
        throw e;
    }

    // =========================================================================
    // STEP 7: Write test-env.json
    // =========================================================================
    header('STEP 7: Write Test Environment');

    const testEnv = {
        scriptAccount: SINGLE_POOL_SCRIPT_ACCOUNT.toBase58(),
        programId: FIVE_PROGRAM_ID.toBase58(),
        vmStatePda: VM_STATE_PDA.toBase58(),
        feeVaultPda: FEE_VAULT_ACCOUNT.toBase58(),
        voteAccount: VOTE_ACCOUNT_PUBKEY.toBase58(),
        poolPda: poolPda.toBase58(),
        poolStakePda: poolStakePda.toBase58(),
        poolMintPda: poolMintPda.toBase58(),
        poolStakeAuthorityPda: poolStakeAuthorityPda.toBase58(),
        poolMintAuthorityPda: poolMintAuthorityPda.toBase58(),
        payerPublicKey: payer.publicKey.toBase58()
    };

    fs.writeFileSync(TEST_ENV_FILE, JSON.stringify(testEnv, null, 2));
    success(`Test environment written to ${TEST_ENV_FILE}`);

    header('✅ Setup Complete');
}

main().catch(e => {
    error(e.message);
    process.exit(1);
});
