import snapshot from './europop2025Exact.json';

export type FertilityProjection = 'baseline' | 'lower';
export type MortalityProjection = 'baseline' | 'lower';
export type MigrationProjection = 'baseline' | 'lower' | 'higher';
export type Sex = 'male' | 'female';

export interface ProjectionProfile {
  fertility: FertilityProjection;
  mortality: MortalityProjection;
  migration: MigrationProjection;
}

export const PROJECTION_ASSUMPTIONS_METADATA = snapshot.metadata;

const FIRST_ASSUMPTION_YEAR = snapshot.years[0];
const LAST_ASSUMPTION_YEAR = snapshot.years[snapshot.years.length - 1];
const LAST_TRANSITION_YEAR =
  snapshot.transitionYears[snapshot.transitionYears.length - 1];

const getYearIndex = (year: number): number => {
  if (year < FIRST_ASSUMPTION_YEAR || year > LAST_ASSUMPTION_YEAR) {
    throw new Error(
      `EUROPOP2025 assumption year ${year} is outside ` +
      `${FIRST_ASSUMPTION_YEAR}-${LAST_ASSUMPTION_YEAR}.`
    );
  }
  return year - FIRST_ASSUMPTION_YEAR;
};

const getTransitionYearIndex = (year: number): number => {
  if (year < FIRST_ASSUMPTION_YEAR || year > LAST_TRANSITION_YEAR) {
    throw new Error(
      `EUROPOP2025 transition year ${year} is outside ` +
      `${FIRST_ASSUMPTION_YEAR}-${LAST_TRANSITION_YEAR}.`
    );
  }
  return year - FIRST_ASSUMPTION_YEAR;
};

const fertilityRatesByProjection = Object.fromEntries(
  (['baseline', 'lower'] as const).map((projection) => [
    projection,
    snapshot.fertility[projection].map((publishedRates) => {
      const rates = Array(101).fill(0);
      snapshot.fertilityAges.forEach((age, index) => {
        rates[age] = publishedRates[index];
      });
      return rates;
    }),
  ])
) as Record<FertilityProjection, number[][]>;

export const getEuropopFertilityRates = (
  year: number,
  projection: FertilityProjection
): readonly number[] => fertilityRatesByProjection[projection][getYearIndex(year)];

export const getEuropopTotalFertilityRate = (
  year: number,
  projection: FertilityProjection
): number => getEuropopFertilityRates(year, projection)
  .reduce((total, rate) => total + rate, 0);

export const getEuropopFertilityExposureCalibration = (
  year: number,
  projection: FertilityProjection
): number => snapshot.fertilityExposureCalibration[projection][
  getTransitionYearIndex(year)
];

export const getEuropopMigrationAmounts = (
  year: number,
  projection: MigrationProjection,
  sex: Sex
): readonly number[] => snapshot.migration[projection][sex][getYearIndex(year)];

export const getEuropopNetMigration = (
  year: number,
  projection: MigrationProjection
): number => (
  getEuropopMigrationAmounts(year, projection, 'male')
    .reduce((total, migration) => total + migration, 0) +
  getEuropopMigrationAmounts(year, projection, 'female')
    .reduce((total, migration) => total + migration, 0)
);

/**
 * Effective one-year survival factors derived from consecutive published
 * EUROPOP2025 stocks after removing the published net-migration component.
 *
 * Index 0-98 advances that source age to age+1. Index 99 advances the
 * combined 99 and 100+ population into the 100+ open group. This preserves
 * Eurostat's actual treatment of its published central mortality rates.
 */
export const getEuropopSurvivalFactors = (
  year: number,
  projection: MortalityProjection,
  sex: Sex
): readonly number[] => snapshot.survival[projection][sex][
  getTransitionYearIndex(year)
];

/**
 * Surviving age-zero population by sex per live birth. These coefficients
 * jointly encode Eurostat's sex ratio at birth and infant mortality treatment.
 */
export const getEuropopNewbornCoefficients = (
  year: number,
  projection: MortalityProjection
): readonly [number, number] => snapshot.newborn[projection][
  getTransitionYearIndex(year)
] as [number, number];

export const getEuropopReferencePopulation = (
  year: number,
  sex: Sex
): readonly number[] => snapshot.referencePopulation[
  String(year) as keyof typeof snapshot.referencePopulation
][sex];
