import { readFile } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { SCENARIOS } from './scenarios.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
const ARTIFACT_PATH = join(PROJECT_ROOT, 'build', 'main.five');

async function loadAbiFunctionNames() {
  try {
    const [{ FiveSDK }, artifactText] = await Promise.all([
      import('@5ive-tech/sdk'),
      readFile(ARTIFACT_PATH, 'utf8')
    ]);
    const { abi } = await FiveSDK.loadFiveFile(artifactText);
    return Array.isArray(abi?.functions) ? abi.functions.map((fn) => fn.name) : [];
  } catch {
    return [];
  }
}

export async function runFiveFlow() {
  const availableFunctions = await loadAbiFunctionNames();

  return SCENARIOS.map((scenario) => ({
    scenario: scenario.name,
    functionName: scenario.fiveFunction,
    functionIndex: scenario.functionIndex,
    availableInAbi: availableFunctions.includes(scenario.fiveFunction),
    signature: null,
    computeUnits: null,
    mode: 'scaffold',
    notes: 'Hook this up to a deployed Five VM script account to collect live CU data.'
  }));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runFiveFlow()
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    });
}
