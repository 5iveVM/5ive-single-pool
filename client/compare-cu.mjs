import { mkdir, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createEmptyReportRow, SCENARIOS } from './scenarios.mjs';
import { runFiveFlow } from './run-five-flow.mjs';
import { runSplFlow } from './run-spl-flow.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
const OUTPUT_PATH = join(PROJECT_ROOT, 'benchmarks', 'results', 'single-pool-cu-report.json');

function buildRow(scenario, fiveResult, splResult) {
  const row = createEmptyReportRow(scenario.name);
  row.five_signature = fiveResult?.signature ?? null;
  row.spl_signature = splResult?.signature ?? null;
  row.five_compute_units = fiveResult?.computeUnits ?? null;
  row.spl_compute_units = splResult?.computeUnits ?? null;

  if (
    typeof row.five_compute_units === 'number' &&
    typeof row.spl_compute_units === 'number'
  ) {
    row.delta_absolute = row.five_compute_units - row.spl_compute_units;
    row.delta_percent = row.spl_compute_units === 0
      ? null
      : Number((((row.five_compute_units - row.spl_compute_units) / row.spl_compute_units) * 100).toFixed(2));
    row.status = 'measured';
    row.notes = 'Live CU data captured for both flows.';
  } else {
    row.status = 'scaffold';
  }

  return row;
}

export async function compareCu() {
  const [fiveResults, splResults] = await Promise.all([runFiveFlow(), runSplFlow()]);
  const report = SCENARIOS.filter((scenario) => scenario.inCuComparison).map((scenario) => {
    const fiveResult = fiveResults.find((entry) => entry.scenario === scenario.name);
    const splResult = splResults.find((entry) => entry.scenario === scenario.name);
    return buildRow(scenario, fiveResult, splResult);
  });

  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, JSON.stringify(report, null, 2) + '\n');
  return report;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  compareCu()
    .then((report) => {
      console.log(JSON.stringify(report, null, 2));
      console.log(`Wrote ${OUTPUT_PATH}`);
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    });
}
