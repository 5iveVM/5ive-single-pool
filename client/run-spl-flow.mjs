import { SCENARIOS } from './scenarios.mjs';

const SPL_PROGRAM_ROOT = '/Users/ivmidable/Development/solana-program-library/single-pool/program';

export async function runSplFlow() {
  return SCENARIOS.map((scenario) => ({
    scenario: scenario.name,
    sourceRoot: SPL_PROGRAM_ROOT,
    signature: null,
    computeUnits: null,
    mode: 'scaffold',
    notes: 'Wire this to program-test or a local validator transaction harness for live SPL CU capture.'
  }));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runSplFlow()
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    });
}
