import { readFile } from 'fs/promises';
import { homedir } from 'os';
import { join } from 'path';
import {
  Keypair,
  Connection,
  PublicKey,
  LAMPORTS_PER_SOL,
  StakeProgram,
  Authorized,
  Lockup,
  SYSVAR_CLOCK_PUBKEY,
  SYSVAR_STAKE_HISTORY_PUBKEY,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import { createMint, getOrCreateAssociatedTokenAccount, getAccount, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { FiveSDK } from '/Users/ivmidable/Development/five-mono/five-sdk/dist/index.js';

const RPC_URL = process.env.FIVE_RPC_URL || 'http://127.0.0.1:8899';
const FIVE_VM_PROGRAM_ID = process.env.FIVE_VM_PROGRAM_ID || '5ive58PJUPaTyAe7tvU1bvBi25o7oieLLTRsJDoQNJst';
const EXISTING_SCRIPT_ACCOUNT = process.env.FIVE_SCRIPT_ACCOUNT || '';

function toBigInt(value) {
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number') return BigInt(Math.trunc(value));
  if (typeof value === 'string') return BigInt(value);
  if (value && typeof value === 'object') {
    for (const key of ['value', 'u64', 'U64', 'result']) {
      if (value[key] !== undefined) return toBigInt(value[key]);
    }
  }
  throw new Error(`unable to coerce return value to bigint: ${JSON.stringify(value)}`);
}

async function loadPayer() {
  const keypairPath = process.env.SOLANA_KEYPAIR_PATH || join(homedir(), '.config/solana/id.json');
  const secret = JSON.parse(await readFile(keypairPath, 'utf8'));
  return Keypair.fromSecretKey(new Uint8Array(secret));
}

async function deployScript(connection, payer, loaded) {
  let deploy;
  if (process.env.FIVE_FORCE_SMALL_DEPLOY === '1') {
    deploy = await FiveSDK.deployToSolana(loaded.bytecode, connection, payer, {
      fiveVMProgramId: FIVE_VM_PROGRAM_ID,
    });
  } else if (loaded.bytecode.length > 1200) {
    deploy = await FiveSDK.deployLargeProgramToSolana(loaded.bytecode, connection, payer, {
      fiveVMProgramId: FIVE_VM_PROGRAM_ID,
    });
  } else {
    deploy = await FiveSDK.deployToSolana(loaded.bytecode, connection, payer, {
      fiveVMProgramId: FIVE_VM_PROGRAM_ID,
    });
  }

  const scriptAccount = deploy.scriptAccount || deploy.programId;
  if (!deploy.success || !scriptAccount) {
    throw new Error(`deploy failed: ${deploy.error || 'unknown error'}`);
  }

  return {
    scriptAccount,
    signature: deploy.transactionId || null,
    cost: deploy.deploymentCost || null,
  };
}

async function executeInstruction(connection, payer, scriptAccount, abi, fn, params, accounts) {
  const res = await FiveSDK.executeOnSolana(
    scriptAccount,
    connection,
    payer,
    fn,
    params,
    accounts,
    {
      abi,
      fiveVMProgramId: FIVE_VM_PROGRAM_ID,
    }
  );
  if (!res.success) {
    throw new Error(`${fn} failed: ${res.error || 'unknown error'}${res.transactionId ? ` (sig=${res.transactionId})` : ''}`);
  }
  return {
    signature: res.transactionId || null,
    cu: res.computeUnitsUsed ?? null,
    result: res.result,
  };
}

function assertDelta(label, before, after, expectedDelta) {
  const actualDelta = after - before;
  if (actualDelta !== expectedDelta) {
    throw new Error(`${label} delta mismatch: expected ${expectedDelta}, got ${actualDelta}`);
  }
}

async function run() {
  const connection = new Connection(RPC_URL, 'confirmed');
  const payer = await loadPayer();

  const artifactText = await readFile(join(process.cwd(), '..', 'build', 'main.five'), 'utf8');
  const loaded = await FiveSDK.loadFiveFile(artifactText);
  const deploy = EXISTING_SCRIPT_ACCOUNT
    ? { scriptAccount: EXISTING_SCRIPT_ACCOUNT, signature: null, cost: null }
    : await deployScript(connection, payer, loaded);

  const vmProgramPk = new PublicKey(FIVE_VM_PROGRAM_ID);
  const vote = Keypair.generate();
  const [pool] = PublicKey.findProgramAddressSync([Buffer.from('pool'), vote.publicKey.toBuffer()], vmProgramPk);
  const [poolStakeAuthority] = PublicKey.findProgramAddressSync(
    [Buffer.from('stake_authority'), pool.toBuffer()],
    vmProgramPk
  );
  const [poolMintAuthority] = PublicKey.findProgramAddressSync(
    [Buffer.from('mint_authority'), pool.toBuffer()],
    vmProgramPk
  );

  const poolStake = Keypair.generate();
  const userStake = Keypair.generate();
  const destinationSeed = `spdst${Date.now().toString().slice(-8)}`;
  const userDestinationStake = await PublicKey.createWithSeed(
    payer.publicKey,
    destinationSeed,
    StakeProgram.programId
  );

  if (process.env.FIVE_AIRDROP_VOTE === '1') {
    const voteAirdropSig = await connection.requestAirdrop(vote.publicKey, LAMPORTS_PER_SOL);
    await connection.confirmTransaction(voteAirdropSig, 'confirmed');
  }
  const minStakeRent = await connection.getMinimumBalanceForRentExemption(StakeProgram.space);
  const stakeLamports = minStakeRent + 2_000_000;
  const stakeAuth = new Authorized(poolStakeAuthority, poolStakeAuthority);

  await sendAndConfirmTransaction(
    connection,
    new Transaction().add(
      StakeProgram.createAccount({
        fromPubkey: payer.publicKey,
        stakePubkey: poolStake.publicKey,
        lamports: stakeLamports,
        authorized: stakeAuth,
        lockup: new Lockup(0, 0, payer.publicKey),
      }),
      StakeProgram.createAccount({
        fromPubkey: payer.publicKey,
        stakePubkey: userStake.publicKey,
        lamports: stakeLamports,
        authorized: stakeAuth,
        lockup: new Lockup(0, 0, payer.publicKey),
      }),
      SystemProgram.createAccountWithSeed({
        fromPubkey: payer.publicKey,
        basePubkey: payer.publicKey,
        seed: destinationSeed,
        newAccountPubkey: userDestinationStake,
        lamports: minStakeRent,
        space: StakeProgram.space,
        programId: StakeProgram.programId,
      }),
    ),
    [payer, poolStake, userStake]
  );

  const poolMint = await createMint(connection, payer, poolMintAuthority, null, 9);
  const userPoolToken = await getOrCreateAssociatedTokenAccount(connection, payer, poolMint, payer.publicKey);

  const init = await executeInstruction(
    connection,
    payer,
    deploy.scriptAccount,
    loaded.abi,
    'initialize_pool',
    [],
      [
      pool.toBase58(),
      payer.publicKey.toBase58(),
      vote.publicKey.toBase58(),
      poolStake.publicKey.toBase58(),
      poolMint.toBase58(),
      poolStakeAuthority.toBase58(),
      poolMintAuthority.toBase58(),
    ]
  );

  const preDeposit = (await getAccount(connection, userPoolToken.address)).amount;
  const deposit = await executeInstruction(
    connection,
    payer,
    deploy.scriptAccount,
    loaded.abi,
    'deposit_stake',
    [vote.publicKey.toBase58()],
    [
      pool.toBase58(),
      poolStake.publicKey.toBase58(),
      poolStakeAuthority.toBase58(),
      userStake.publicKey.toBase58(),
      SYSVAR_CLOCK_PUBKEY.toBase58(),
      SYSVAR_STAKE_HISTORY_PUBKEY.toBase58(),
      poolMint.toBase58(),
      poolMintAuthority.toBase58(),
      userPoolToken.address.toBase58(),
      TOKEN_PROGRAM_ID.toBase58(),
      StakeProgram.programId.toBase58(),
    ]
  );
  const postDeposit = (await getAccount(connection, userPoolToken.address)).amount;
  const mintedPoolTokens = postDeposit - preDeposit;
  if (mintedPoolTokens <= 0n) {
    throw new Error(`deposit pool token delta must be > 0, got ${mintedPoolTokens}`);
  }

  const burnAmount = mintedPoolTokens > 1_000_000n ? 1_000_000n : mintedPoolTokens / 2n;
  const preWithdraw = (await getAccount(connection, userPoolToken.address)).amount;
  const withdraw = await executeInstruction(
    connection,
    payer,
    deploy.scriptAccount,
    loaded.abi,
    'withdraw_stake',
    [vote.publicKey.toBase58(), Number(burnAmount)],
    [
      pool.toBase58(),
      poolStake.publicKey.toBase58(),
      poolStakeAuthority.toBase58(),
      poolMint.toBase58(),
      poolMintAuthority.toBase58(),
      userDestinationStake.toBase58(),
      payer.publicKey.toBase58(),
      userPoolToken.address.toBase58(),
      TOKEN_PROGRAM_ID.toBase58(),
      StakeProgram.programId.toBase58(),
      SYSVAR_CLOCK_PUBKEY.toBase58(),
      SYSVAR_STAKE_HISTORY_PUBKEY.toBase58(),
    ]
  );
  const postWithdraw = (await getAccount(connection, userPoolToken.address)).amount;
  assertDelta('withdraw pool token', preWithdraw, postWithdraw, -burnAmount);

  const withdrawStakeAmount =
    withdraw.result !== undefined &&
    withdraw.result !== null &&
    withdraw.result !== 'Execution completed successfully'
      ? toBigInt(withdraw.result)
      : 0n;

  console.log('SINGLE_POOL_LOCALNET_FLOW');
  console.log(`  rpc=${RPC_URL}`);
  console.log(`  five_vm_program_id=${FIVE_VM_PROGRAM_ID}`);
  console.log(`  script_account=${deploy.scriptAccount}`);
  console.log(`  deploy_sig=${deploy.signature || 'n/a'}`);
  console.log(`  deploy_cost_lamports=${deploy.cost ?? 'n/a'}`);
  console.log(`  initialize_pool sig=${init.signature || 'n/a'} cu=${init.cu ?? 'n/a'}`);
  console.log(`  deposit_stake sig=${deposit.signature || 'n/a'} cu=${deposit.cu ?? 'n/a'}`);
  console.log(`  withdraw_stake sig=${withdraw.signature || 'n/a'} cu=${withdraw.cu ?? 'n/a'} return=${withdrawStakeAmount}`);
  console.log(`  user_pool_token_before_deposit=${preDeposit}`);
  console.log(`  user_pool_token_after_deposit=${postDeposit}`);
  console.log(`  user_pool_token_after_withdraw=${postWithdraw}`);
}

run().catch((err) => {
  console.error('[single-pool-flow] failed:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
