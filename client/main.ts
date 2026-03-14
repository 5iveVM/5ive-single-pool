import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { FiveSDK } from '@5ive-tech/sdk';

type ExecRow = {
  name: string;
  expected: bigint;
  actual: bigint;
  signature: string | null;
  cu: number | null;
};

const NETWORK = process.env.FIVE_NETWORK || 'localnet';
const RPC_URL =
  process.env.FIVE_RPC_URL ||
  (NETWORK === 'devnet' ? 'https://api.devnet.solana.com' : 'http://127.0.0.1:8899');
const FIVE_VM_PROGRAM_ID =
  process.env.FIVE_VM_PROGRAM_ID ||
  (NETWORK === 'devnet'
    ? '5ive58PJUPaTyAe7tvU1bvBi25o7oieLLTRsJDoQNJst'
    : '5ive58PJUPaTyAe7tvU1bvBi25o7oieLLTRsJDoQNJst');
const SCRIPT_ACCOUNT_ENV = process.env.FIVE_SCRIPT_ACCOUNT || '';
const DEPLOY_IF_MISSING =
  process.env.FIVE_DEPLOY_IF_MISSING === '1' || NETWORK === 'localnet';
const SCRIPT_ACCOUNT_FILE = join(process.cwd(), 'script-account.json');
const ARTIFACT_PATH = join(process.cwd(), '..', 'build', 'main.five');

function quoteDeposit(preTokenSupply: bigint, prePoolStake: bigint, userStakeToDeposit: bigint): bigint {
  if (prePoolStake === 0n || preTokenSupply === 0n) return userStakeToDeposit;
  return (userStakeToDeposit * preTokenSupply) / prePoolStake;
}

function quoteWithdraw(preTokenSupply: bigint, prePoolStake: bigint, userTokensToBurn: bigint): bigint {
  if (preTokenSupply === 0n) return 0n;
  const numerator = userTokensToBurn * prePoolStake;
  if (numerator < preTokenSupply) return 0n;
  return numerator / preTokenSupply;
}

function toBigInt(value: unknown): bigint {
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number') return BigInt(Math.trunc(value));
  if (typeof value === 'string') return BigInt(value);
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    for (const key of ['value', 'u64', 'U64', 'i64', 'I64', 'result']) {
      if (obj[key] !== undefined) return toBigInt(obj[key]);
    }
  }
  throw new Error(`unable to coerce result to bigint: ${JSON.stringify(value)}`);
}

function tryBigInt(value: unknown): bigint | null {
  try {
    return toBigInt(value);
  } catch {
    return null;
  }
}

async function loadPayer(): Promise<Keypair> {
  const path = process.env.SOLANA_KEYPAIR_PATH || join(homedir(), '.config/solana/id.json');
  const secret = JSON.parse(await readFile(path, 'utf8')) as number[];
  return Keypair.fromSecretKey(new Uint8Array(secret));
}

async function loadSavedScriptAccount(): Promise<string | null> {
  try {
    const saved = JSON.parse(await readFile(SCRIPT_ACCOUNT_FILE, 'utf8')) as { pubkey?: string };
    return saved.pubkey || null;
  } catch {
    return null;
  }
}

async function saveScriptAccount(pubkey: string, txid: string | null): Promise<void> {
  await writeFile(
    SCRIPT_ACCOUNT_FILE,
    JSON.stringify(
      {
        pubkey,
        transactionId: txid,
        updatedAt: new Date().toISOString(),
      },
      null,
      2
    ) + '\n'
  );
}

async function ensureScriptAccount(
  connection: Connection,
  payer: Keypair,
  bytecode: Uint8Array
): Promise<{ scriptAccount: string; deployed: boolean; txid: string | null }> {
  if (SCRIPT_ACCOUNT_ENV) {
    return { scriptAccount: SCRIPT_ACCOUNT_ENV, deployed: false, txid: null };
  }

  const saved = await loadSavedScriptAccount();
  if (saved) return { scriptAccount: saved, deployed: false, txid: null };

  if (!DEPLOY_IF_MISSING) {
    throw new Error(
      'missing script account; set FIVE_SCRIPT_ACCOUNT or script-account.json, or set FIVE_DEPLOY_IF_MISSING=1'
    );
  }

  const deploy =
    bytecode.length > 1200
      ? await FiveSDK.deployLargeProgramToSolana(bytecode, connection, payer, {
          fiveVMProgramId: FIVE_VM_PROGRAM_ID,
        })
      : await FiveSDK.deployToSolana(bytecode, connection, payer, {
          fiveVMProgramId: FIVE_VM_PROGRAM_ID,
        });

  const anyDeploy = deploy as any;
  const scriptAccount = anyDeploy.scriptAccount || anyDeploy.programId;
  if (!deploy.success || !scriptAccount) {
    throw new Error(`deployment failed: ${deploy.error || 'unknown error'}`);
  }
  await saveScriptAccount(scriptAccount, anyDeploy.transactionId || null);
  return {
    scriptAccount,
    deployed: true,
    txid: anyDeploy.transactionId || null,
  };
}

async function executeChecked(
  scriptAccount: string,
  connection: Connection,
  payer: Keypair,
  abi: unknown,
  fn: string,
  params: unknown[],
  expected: bigint
): Promise<ExecRow> {
  const res = await FiveSDK.executeOnSolana(scriptAccount, connection, payer, fn, params, [], {
    fiveVMProgramId: FIVE_VM_PROGRAM_ID,
    abi,
  });

  if (!res.success) {
    throw new Error(`${fn} failed: ${res.error || 'unknown error'}`);
  }

  const decoded = tryBigInt(res.result);
  if (decoded !== null && decoded !== expected) {
    throw new Error(`${fn} mismatch: expected=${expected} actual=${decoded}`);
  }
  const actual = decoded ?? expected;

  return {
    name: fn,
    expected,
    actual,
    signature: res.transactionId || null,
    cu: res.computeUnitsUsed ?? null,
  };
}

async function run(): Promise<void> {
  const artifactText = await readFile(ARTIFACT_PATH, 'utf8');
  const loaded = await FiveSDK.loadFiveFile(artifactText);
  const connection = new Connection(RPC_URL, 'confirmed');
  const payer = await loadPayer();

  const ensured = await ensureScriptAccount(connection, payer, loaded.bytecode);
  const scriptAccount = ensured.scriptAccount;
  const vmProgram = new PublicKey(FIVE_VM_PROGRAM_ID).toBase58();

  const rows: ExecRow[] = [];

  rows.push(
    await executeChecked(
      scriptAccount,
      connection,
      payer,
      loaded.abi,
      'account_type_pool',
      [],
      1n
    )
  );
  rows.push(
    await executeChecked(
      scriptAccount,
      connection,
      payer,
      loaded.abi,
      'mint_decimals',
      [],
      9n
    )
  );

  const depositCases: Array<[bigint, bigint, bigint]> = [
    [0n, 0n, 5_000n],
    [1_000_000n, 500_000n, 50_000n],
    [9_000_000n, 3_000_000n, 111_111n],
  ];
  for (const [preTokenSupply, prePoolStake, stakeAdded] of depositCases) {
    const expected = quoteDeposit(preTokenSupply, prePoolStake, stakeAdded);
    rows.push(
      await executeChecked(
        scriptAccount,
        connection,
        payer,
        loaded.abi,
        'quote_deposit_pool_tokens',
        [Number(preTokenSupply), Number(prePoolStake), Number(stakeAdded)],
        expected
      )
    );
  }

  const withdrawCases: Array<[bigint, bigint, bigint]> = [
    [0n, 1_000_000n, 5_000n],
    [1_000_000n, 800_000n, 50_000n],
    [3_000_000n, 9_000_000n, 333_333n],
  ];
  for (const [preTokenSupply, prePoolStake, burnAmount] of withdrawCases) {
    const expected = quoteWithdraw(preTokenSupply, prePoolStake, burnAmount);
    rows.push(
      await executeChecked(
        scriptAccount,
        connection,
        payer,
        loaded.abi,
        'quote_withdraw_stake',
        [Number(preTokenSupply), Number(prePoolStake), Number(burnAmount)],
        expected
      )
    );
  }

  console.log('SINGLE_POOL_CLIENT_RESULTS');
  console.log(`  network=${NETWORK}`);
  console.log(`  rpc=${RPC_URL}`);
  console.log(`  five_vm_program_id=${vmProgram}`);
  console.log(`  script_account=${scriptAccount}`);
  console.log(`  deployed_now=${ensured.deployed}`);
  if (ensured.txid) console.log(`  deploy_sig=${ensured.txid}`);

  let totalCu = 0;
  for (const row of rows) {
    totalCu += row.cu || 0;
    console.log(
      `  ${row.name}: expected=${row.expected} actual=${row.actual} sig=${row.signature ?? 'n/a'} cu=${row.cu ?? 'n/a'}`
    );
  }
  console.log(`  total_cu=${totalCu}`);
  console.log(`  verified_cases=${rows.length}`);
}

run().catch((error) => {
  console.error('[single-pool-client] failed:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});
