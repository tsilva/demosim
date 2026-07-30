import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const repositoryRoot = resolve(import.meta.dirname, '..');
const europop = JSON.parse(await readFile(
  resolve(repositoryRoot, 'data/europop2025Exact.json'),
  'utf8'
));
const economics = JSON.parse(await readFile(
  resolve(repositoryRoot, 'data/economicParams.json'),
  'utf8'
));

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const approximatelyEqual = (actual, expected, tolerance, label) => {
  assert(
    Math.abs(actual - expected) <= tolerance,
    `${label}: expected ${expected}, received ${actual}`
  );
};

assert(europop.years[0] === 2025, 'EUROPOP snapshot must start in 2025');
assert(europop.years.at(-1) === 2100, 'EUROPOP snapshot must end in 2100');
assert(europop.years.length === 76, 'EUROPOP snapshot must contain 76 annual observations');
assert(
  europop.years.every((year, index) => year === 2025 + index),
  'EUROPOP snapshot years must be continuous'
);
assert(
  europop.metadata.validation.maxTransitionReproductionError === 0,
  'Official cohort transitions must reproduce with zero error'
);
assert(
  europop.metadata.validation.maxBirthReproductionError === 0,
  'Official birth totals must reproduce with zero error'
);

const year2026Index = 1;
approximatelyEqual(
  europop.fertility.baseline[year2026Index].reduce(
    (total, rate) => total + rate,
    0
  ),
  1.46506,
  1e-12,
  '2026 baseline TFR'
);
approximatelyEqual(
  ['male', 'female'].reduce((total, sex) => (
    total + europop.migration.baseline[sex][year2026Index]
      .reduce((subtotal, value) => subtotal + value, 0)
  ), 0),
  132517,
  0,
  '2026 baseline net migration'
);

for (const mortality of ['baseline', 'lower']) {
  for (const sex of ['male', 'female']) {
    for (const annualFactors of europop.survival[mortality][sex]) {
      assert(
        annualFactors.every((factor) => factor >= 0 && factor <= 1),
        `${mortality}/${sex} survival factors must remain in [0, 1]`
      );
    }
  }
}

const ss = economics.socialSecurity.officialExecution2025;
approximatelyEqual(
  ss.effectiveRevenue - ss.effectiveExpenditure,
  ss.balance,
  0,
  '2025 Social Security balance'
);
approximatelyEqual(
  economics.healthcare.publicExpenditure2025 /
    economics.healthcare.totalExpenditure2025,
  economics.healthcare.publicShare,
  1e-15,
  '2025 public healthcare share'
);
approximatelyEqual(
  economics.socialSecurity.totalPublicPensionExpenditure2025 /
    economics.productivity.gdp2025 * 100,
  economics.publicPensions.spendingShareOfGdpKeyframes[0].value,
  1e-12,
  '2025 public pension share of GDP'
);

console.log('Model data validation passed');
console.log(
  `EUROPOP ${europop.years[0]}-${europop.years.at(-1)}; ` +
  'zero official transition and birth reproduction error'
);
