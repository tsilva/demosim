import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const EUROSTAT_API =
  'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data';
const GEOGRAPHY = 'PT';
const START_YEAR = 2025;
const END_YEAR = 2100;

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, '..');
const outputPath = resolve(repositoryRoot, 'data/europop2025Exact.json');

const fetchDataset = async (dataset, parameters = {}) => {
  const url = new URL(`${EUROSTAT_API}/${dataset}`);
  url.searchParams.set('geo', GEOGRAPHY);
  url.searchParams.set('lang', 'en');
  for (const [key, value] of Object.entries(parameters)) {
    url.searchParams.set(key, String(value));
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Eurostat ${dataset} request failed: ${response.status}`);
  }

  return response.json();
};

const getCategoryIndex = (dataset, dimension, category) => {
  const index = dataset.dimension[dimension]?.category?.index?.[category];
  if (index === undefined) {
    throw new Error(`Missing ${dimension}=${category} in ${dataset.label}`);
  }
  return index;
};

const readValue = (dataset, coordinates) => {
  let flatIndex = 0;
  dataset.id.forEach((dimension, dimensionIndex) => {
    const category = coordinates[dimension];
    if (category === undefined) {
      throw new Error(`Missing coordinate for ${dimension} in ${dataset.label}`);
    }
    flatIndex =
      flatIndex * dataset.size[dimensionIndex] +
      getCategoryIndex(dataset, dimension, category);
  });

  const value = dataset.value[String(flatIndex)];
  if (value === undefined) {
    throw new Error(
      `Missing value in ${dataset.label}: ${JSON.stringify(coordinates)}`
    );
  }
  return value;
};

const years = Array.from(
  { length: END_YEAR - START_YEAR + 1 },
  (_, index) => START_YEAR + index
);
// Eurostat publishes the very small under-15 and 50+ fertility contributions
// as grouped values. They are assigned to boundary ages 14 and 50 so their
// contribution to TFR and births is preserved exactly.
const fertilityAges = Array.from({ length: 37 }, (_, index) => index + 14);
const demographicAges = Array.from({ length: 101 }, (_, index) => index);
const sexes = ['male', 'female'];

const ageCode = (age, openAgeCode) => {
  if (age === 0) return 'Y_LT1';
  if (age === 100) return openAgeCode;
  return `Y${age}`;
};

const sexCode = {
  male: 'M',
  female: 'F',
};

const fertilityAgeCode = (age) => {
  if (age === 14) return 'Y_LT15';
  if (age === 50) return 'Y_GE50';
  return `Y${age}`;
};

const mapAnnualAgeValues = (
  dataset,
  projection,
  selectedYears,
  ages,
  buildCoordinates
) => selectedYears.map((year) => (
  ages.map((age) => readValue(dataset, {
    freq: 'A',
    projection,
    geo: GEOGRAPHY,
    time: String(year),
    ...buildCoordinates(age),
  }))
));

const buildSnapshot = async () => {
  const [fertilityDataset, mortalityDataset, migrationDataset, populationDataset, indicatorsDataset] =
    await Promise.all([
      fetchDataset('proj_25naasfr'),
      fetchDataset('proj_25naasmr'),
      fetchDataset('proj_25nanmig'),
      fetchDataset('proj_25np'),
      fetchDataset('proj_25ndbi'),
    ]);

  const fertility = Object.fromEntries([
    ['baseline', 'BSL'],
    ['lower', 'LFRT'],
  ].map(([name, projection]) => [
    name,
    mapAnnualAgeValues(
      fertilityDataset,
      projection,
      years,
      fertilityAges,
      (age) => ({ age: fertilityAgeCode(age), unit: 'NR' })
    ),
  ]));

  const mortality = Object.fromEntries([
    ['baseline', 'BSL'],
    ['lower', 'LMRT'],
  ].map(([name, projection]) => [
    name,
    Object.fromEntries(sexes.map((sex) => [
      sex,
      mapAnnualAgeValues(
        mortalityDataset,
        projection,
        years,
        demographicAges,
        (age) => ({
          sex: sexCode[sex],
          age: ageCode(age, 'Y_GE100'),
          unit: 'NR',
        })
      ),
    ])),
  ]));

  const migration = Object.fromEntries([
    ['baseline', 'BSL'],
    ['lower', 'LMIGR'],
    ['higher', 'HMIGR'],
  ].map(([name, projection]) => [
    name,
    Object.fromEntries(sexes.map((sex) => [
      sex,
      mapAnnualAgeValues(
        migrationDataset,
        projection,
        years,
        demographicAges,
        (age) => ({
          sex: sexCode[sex],
          age: ageCode(age, 'Y_GE100'),
          unit: 'PER',
        })
      ),
    ])),
  ]));

  const populationByProjection = Object.fromEntries([
    ['baseline', 'BSL'],
    ['lower', 'LMRT'],
    ['lowerFertility', 'LFRT'],
  ].map(([name, projection]) => [
    name,
    Object.fromEntries(sexes.map((sex) => [
      sex,
      mapAnnualAgeValues(
        populationDataset,
        projection,
        years,
        demographicAges,
        (age) => ({
          sex: sexCode[sex],
          age: ageCode(age, 'Y_GE100'),
          unit: 'PER',
        })
      ),
    ])),
  ]));

  const birthsByProjection = Object.fromEntries([
    ['baseline', 'BSL'],
    ['lower', 'LMRT'],
  ].map(([name, projection]) => [
    name,
    years.map((year) => readValue(indicatorsDataset, {
      freq: 'A',
      indic_de: 'LBIRTH',
      projection,
      geo: GEOGRAPHY,
      time: String(year),
    })),
  ]));

  const fertilityBirthsByProjection = Object.fromEntries([
    ['baseline', 'BSL'],
    ['lower', 'LFRT'],
  ].map(([name, projection]) => [
    name,
    years.map((year) => readValue(indicatorsDataset, {
      freq: 'A',
      indic_de: 'LBIRTH',
      projection,
      geo: GEOGRAPHY,
      time: String(year),
    })),
  ]));

  const fertilityExposureCalibration = Object.fromEntries(
    ['baseline', 'lower'].map((name) => {
      const femalePopulation = populationByProjection[
        name === 'baseline' ? 'baseline' : 'lowerFertility'
      ].female;
      return [
        name,
        years.slice(0, -1).map((_, yearIndex) => {
          const estimatedBirths = fertilityAges.reduce((total, age, ageIndex) => {
            const exposure = (
              femalePopulation[yearIndex][age - 1] +
              femalePopulation[yearIndex][age]
            ) / 2;
            return total + exposure * fertility[name][yearIndex][ageIndex];
          }, 0);
          return fertilityBirthsByProjection[name][yearIndex] / estimatedBirths;
        }),
      ];
    })
  );

  // The published mortality inputs are central rates (deaths / person-years),
  // not one-year probabilities. Derive the exact effective cohort-survival
  // factors used by Eurostat from consecutive official population stocks after
  // removing the published age-specific net-migration contribution. This
  // reproduces Eurostat's own cohort transition without guessing an m(x)->q(x)
  // conversion or migration timing convention.
  const transitionYears = years.slice(0, -1);
  const survival = Object.fromEntries(
    ['baseline', 'lower'].map((name) => [
      name,
      Object.fromEntries(sexes.map((sex) => {
        const population = populationByProjection[name][sex];
        const scenarioMigration = migrationDataset.dimension.projection.category.index[
          name === 'baseline' ? 'BSL' : 'LMRT'
        ] !== undefined
          ? mapAnnualAgeValues(
              migrationDataset,
              name === 'baseline' ? 'BSL' : 'LMRT',
              years,
              demographicAges,
              (age) => ({
                sex: sexCode[sex],
                age: ageCode(age, 'Y_GE100'),
                unit: 'PER',
              })
            )
          : migration.baseline[sex];

        const annualSurvival = transitionYears.map((_, yearIndex) => {
          const currentPopulation = population[yearIndex];
          const nextPopulation = population[yearIndex + 1];
          const annualMigration = scenarioMigration[yearIndex];
          const factors = Array(100);

          for (let sourceAge = 0; sourceAge <= 98; sourceAge++) {
            factors[sourceAge] = (
              nextPopulation[sourceAge + 1] - annualMigration[sourceAge + 1]
            ) / currentPopulation[sourceAge];
          }

          factors[99] = (
            nextPopulation[100] - annualMigration[100]
          ) / (currentPopulation[99] + currentPopulation[100]);
          return factors;
        });

        return [sex, annualSurvival];
      })),
    ])
  );

  const newborn = Object.fromEntries(
    ['baseline', 'lower'].map((name) => {
      const projection = name === 'baseline' ? 'BSL' : 'LMRT';
      const scenarioMigration = Object.fromEntries(sexes.map((sex) => [
        sex,
        mapAnnualAgeValues(
          migrationDataset,
          projection,
          years,
          demographicAges,
          (age) => ({
            sex: sexCode[sex],
            age: ageCode(age, 'Y_GE100'),
            unit: 'PER',
          })
        ),
      ]));

      return [
        name,
        transitionYears.map((_, yearIndex) => {
          const births = birthsByProjection[name][yearIndex];
          return sexes.map((sex) => (
            populationByProjection[name][sex][yearIndex + 1][0] -
            scenarioMigration[sex][yearIndex][0]
          ) / births);
        }),
      ];
    })
  );

  let maxTransitionReproductionError = 0;
  for (const name of ['baseline', 'lower']) {
    const projection = name === 'baseline' ? 'BSL' : 'LMRT';
    for (const sex of sexes) {
      const scenarioMigration = mapAnnualAgeValues(
        migrationDataset,
        projection,
        years,
        demographicAges,
        (age) => ({
          sex: sexCode[sex],
          age: ageCode(age, 'Y_GE100'),
          unit: 'PER',
        })
      );
      for (let yearIndex = 0; yearIndex < transitionYears.length; yearIndex++) {
        const current = populationByProjection[name][sex][yearIndex];
        const next = populationByProjection[name][sex][yearIndex + 1];
        const factors = survival[name][sex][yearIndex];
        const births = birthsByProjection[name][yearIndex];
        const reproducedAgeZero =
          Math.round(births * newborn[name][yearIndex][sexes.indexOf(sex)]) +
          scenarioMigration[yearIndex][0];
        maxTransitionReproductionError = Math.max(
          maxTransitionReproductionError,
          Math.abs(reproducedAgeZero - next[0])
        );

        for (let targetAge = 1; targetAge < 100; targetAge++) {
          const reproduced =
            Math.round(current[targetAge - 1] * factors[targetAge - 1]) +
            scenarioMigration[yearIndex][targetAge];
          maxTransitionReproductionError = Math.max(
            maxTransitionReproductionError,
            Math.abs(reproduced - next[targetAge])
          );
        }

        const reproducedOpen =
          Math.round((current[99] + current[100]) * factors[99]) +
          scenarioMigration[yearIndex][100];
        maxTransitionReproductionError = Math.max(
          maxTransitionReproductionError,
          Math.abs(reproducedOpen - next[100])
        );
      }
    }
  }

  let maxBirthReproductionError = 0;
  for (const name of ['baseline', 'lower']) {
    const femalePopulation = populationByProjection[
      name === 'baseline' ? 'baseline' : 'lowerFertility'
    ].female;
    for (let yearIndex = 0; yearIndex < transitionYears.length; yearIndex++) {
      const estimatedBirths = fertilityAges.reduce((total, age, ageIndex) => {
        const exposure = (
          femalePopulation[yearIndex][age - 1] +
          femalePopulation[yearIndex][age]
        ) / 2;
        return total + exposure * fertility[name][yearIndex][ageIndex];
      }, 0) * fertilityExposureCalibration[name][yearIndex];
      maxBirthReproductionError = Math.max(
        maxBirthReproductionError,
        Math.abs(
          Math.round(estimatedBirths) -
          fertilityBirthsByProjection[name][yearIndex]
        )
      );
    }
  }

  if (maxTransitionReproductionError > 0 || maxBirthReproductionError > 0) {
    throw new Error(
      `EUROPOP snapshot validation failed: transition error ` +
      `${maxTransitionReproductionError}, birth error ${maxBirthReproductionError}`
    );
  }

  const referencePopulation = Object.fromEntries(
    years.map((year, yearIndex) => [
      year,
      Object.fromEntries(sexes.map((sex) => [
        sex,
        populationByProjection.baseline[sex][yearIndex],
      ])),
    ])
  );

  return {
    metadata: {
      edition: 'EUROPOP2025',
      geography: GEOGRAPHY,
      downloadedAt: new Date().toISOString(),
      sourceUpdatedAt: {
        fertility: fertilityDataset.updated,
        mortality: mortalityDataset.updated,
        migration: migrationDataset.updated,
        population: populationDataset.updated,
        indicators: indicatorsDataset.updated,
      },
      datasets: {
        fertility: 'proj_25naasfr',
        mortality: 'proj_25naasmr',
        migration: 'proj_25nanmig',
        population: 'proj_25np',
        indicators: 'proj_25ndbi',
      },
      validation: {
        maxTransitionReproductionError,
        maxBirthReproductionError,
      },
    },
    years,
    fertilityAges,
    demographicAges,
    fertility,
    fertilityExposureCalibration,
    migration,
    transitionYears,
    survival,
    newborn,
    referencePopulation,
  };
};

const snapshot = await buildSnapshot();
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(snapshot)}\n`, 'utf8');

console.log(`Wrote ${outputPath}`);
console.log(
  `Years ${snapshot.years[0]}-${snapshot.years.at(-1)}; ` +
  `${snapshot.demographicAges.length} demographic ages`
);
