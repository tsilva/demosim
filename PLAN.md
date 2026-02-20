# Simulation Fix Plan

## Overview
This document outlines the comprehensive plan to fix all identified simulation inaccuracies in the Portugal demographic simulator.

## Phase 1: Critical Data Fixes (HIGH PRIORITY)

### 1.1 Fix Data Inconsistency
- **Issue**: `population2024.json` and `population2024.ts` have different values (e.g., age 47: 87,602 vs 81,837 male)
- **Root Cause**: JSON file is stale/out of sync with TypeScript source
- **Fix**: Update JSON file to match TS file values (TS is the source of truth based on imports)
- **Files**: `data/population2024.json`
- **Impact**: Ensures consistent data across the application

## Phase 2: Core Simulation Logic Fixes (HIGH PRIORITY)

### 2.1 Fix Death Carry-Over Logic
- **Issue**: Death carry-over accumulates across all age groups instead of being reset per cohort
- **Current Behavior**: Lines 430-433 declare carry-over variables once, then accumulate across all ages
- **Problem**: Deaths from age 0 affect calculations for age 1, 2, etc.
- **Fix**: Move carry-over initialization inside the age loop so each cohort has independent carry-over
- **Location**: `utils/simulation.ts` lines 430-433, 466-471
- **Impact**: Prevents cross-cohort contamination of death calculations

### 2.2 Fix Age 100+ Mortality Handling
- **Issue**: Age 100+ survivors aggregated into age-100 bucket may create immortal cohort
- **Root Cause**: Carry-over logic combined with qx=1.0 not truly enforcing 100% mortality
- **Current Behavior**: 
  - Age 100+ processed with carry-over from previous ages
  - Survivors accumulated into age-100 bucket
  - Next year, same group processed again
- **Fix**: 
  - Reset death carry-over before processing age 100+ group
  - Ensure qx=1.0 truly means 100% mortality (no survivors possible)
  - Add explicit check: if age >= 100 and qx >= 1.0, all die (no carry-over accumulation)
- **Location**: `utils/simulation.ts` lines 448-461, 519-526
- **Impact**: Eliminates immortal cohort bug

### 2.3 Fix Migration Order (Apply Before Mortality)
- **Issue**: Migration is applied after mortality, meaning migrants don't experience mortality in arrival year
- **Current Behavior**: 
  1. Calculate deaths on current population
  2. Add migrants to survivors
- **Standard Practice**: UN/Eurostat cohort-component method typically uses mid-year population
- **Fix**: Reorder operations:
  1. Add migrants to population (mid-year assumption)
  2. Calculate mortality on combined population
  3. Apply deaths
- **Location**: `utils/simulation.ts` lines 464-490
- **Impact**: More accurate mortality counts (migrants experience partial-year mortality)

### 2.4 Add Migration Mortality
- **Issue**: Migrants added during year don't experience any mortality
- **Fix**: Apply half-year mortality rate to migrants (simplified mid-year assumption)
- **Formula**: `migrantDeaths = migrants * (1 - sqrt(1 - annualQx))` (approximates half-year exposure)
- **Location**: `utils/simulation.ts` migration application logic
- **Impact**: Small but correct accounting for migrant mortality

## Phase 3: Economic Calculation Fixes (MEDIUM PRIORITY)

### 3.1 Fix Labor Utilization Rate Definition
- **Issue**: Rate can exceed 1.0 because working retirees are included in numerator but not denominator
- **Current Behavior**: `actualWorkforce / workingAgePop` where working retirees are in workforce but not working-age
- **Options**:
  - Option A: Rename to `effectiveLaborForceRatio` and document it can exceed 1.0
  - Option B: Change denominator to include all adults (15+)
- **Recommendation**: Option A with better documentation and capping at 1.0 for display
- **Location**: `utils/simulation.ts` lines 299-300
- **Impact**: Clearer metric definition

### 3.2 Add Productivity Adjustment for Workforce Composition
- **Issue**: GDP per worker is static except for inflation
- **Problem**: Workforce composition changes (aging, education shifts) affect productivity
- **Fix**: Add productivity multiplier based on workforce age composition
- **Implementation**:
  - Peak productivity at age 45-50: 1.0x
  - Ages 25-35: 0.85x (gaining experience)
  - Ages 35-45: 0.95x
  - Ages 50-60: 0.95x
  - Ages 60+: 0.85x declining to 0.75x at 65+
- **Formula**: `weightedProductivity = sum(ageGroupWorkers * ageProductivity) / totalWorkers`
- **Location**: `utils/simulation.ts` `calculateEconomicMetrics` function
- **Impact**: More realistic GDP projections as workforce ages

### 3.3 Add Healthcare Labor Cost Component
- **Issue**: Healthcare costs rise faster than wages, but model ignores healthcare labor intensity
- **Current**: All healthcare grows at 2% inflation
- **Reality**: Healthcare is ~60% labor costs which track wages
- **Fix**: Split healthcare costs:
  - Labor (60%): grows at `wageGrowth + 0.5%` (healthcare wage premium)
  - Capital/Other (40%): grows at `healthcareInflation` (2%)
- **Formula**: `healthcareInflationFactor = 0.6 * wageInflationFactor * 1.005^years + 0.4 * healthcareInflationFactor`
- **Location**: `utils/simulation.ts` lines 255-265
- **Impact**: More accurate long-term healthcare cost projections

## Phase 4: Demographic Enhancement (MEDIUM PRIORITY)

### 4.1 Add Age-Specific Mortality Improvement
- **Issue**: Uniform improvement rate across all ages is unrealistic
- **Current**: Same improvement rate for infants and elderly
- **Reality**: 
  - Infant mortality improves fastest (medical advances)
  - Elderly improvement slows (diminishing returns)
- **Fix**: Implement age-varying improvement rates:
  - Infant (0-1): 2.0% improvement
  - Child/Young Adult (1-40): 1.5% improvement
  - Middle Age (40-70): 1.0% improvement
  - Elderly (70+): 0.5% improvement
- **Location**: `utils/simulation.ts` `getMortalityRate` function (lines 34-56)
- **Impact**: More realistic life expectancy projections

### 4.2 Add Fertility Timing Adjustment
- **Issue**: ASFR shape stays constant when TFR changes
- **Current**: Simple proportional scaling: `scaledASFR = baseASFR * (userTFR / 1.40)`
- **Reality**: Lower TFR correlates with later childbearing
- **Fix**: Shift mean age at childbirth based on TFR deviation from baseline:
  - TFR < 1.3: shift +1.0 year (later childbearing)
  - TFR 1.3-1.5: no shift (baseline)
  - TFR > 1.8: shift -0.5 years (earlier childbearing)
- **Implementation**: Apply age-shift to ASFR lookup (interpolate between ages)
- **Location**: `utils/simulation.ts` `getFertilityRate` function (lines 63-68)
- **Impact**: More realistic birth distribution across ages

### 4.3 Add Migration Scaling Option
- **Issue**: Net migration is constant regardless of population size
- **Current**: `netMigration = params.netMigration` (fixed number)
- **Reality**: Migration often proportional to working-age population
- **Fix**: Add optional migration scaling:
  - Mode "constant": current behavior (default)
  - Mode "proportional": `netMigration = params.netMigration * (currentWorkingAgePop / baseWorkingAgePop)`
- **Location**: `utils/simulation.ts` migration calculation (lines 422-424)
- **Impact**: More realistic long-term migration scenarios

## Phase 5: Validation & Testing (MEDIUM PRIORITY)

### 5.1 Improve Population Balance Validation
- **Issue**: Fixed threshold of 500 doesn't scale with population
- **Current**: Warn if `balanceError > 500`
- **Fix**: Change to percentage-based threshold:
  - Warn if `balanceError > totalPopulation * 0.00005` (0.005%)
- **Location**: `utils/simulation.ts` lines 533-541
- **Impact**: Appropriate validation across all population sizes

### 5.2 Add Sanity Check Warnings
- **Issue**: No warnings for extreme/unrealistic scenarios
- **Fix**: Add warnings for:
  - Negative population in any age group
  - Dependency ratio > 100% (more retirees than workers)
  - Workforce participation < 30%
  - TFR > 5.0 (unrealistic for developed country)
  - Net migration > 10% of population
- **Location**: `utils/simulation.ts` after each simulation year
- **Impact**: Early detection of parameter errors

## Implementation Order

1. **Phase 1** (Critical): Data consistency
2. **Phase 2** (Critical): Core simulation bugs
3. **Phase 3** (High): Economic accuracy
4. **Phase 4** (Medium): Demographic realism
5. **Phase 5** (Low): Validation improvements

## Testing Strategy

After each phase:
1. Run simulation with default parameters (2024-2100)
2. Verify total population trend is reasonable
3. Check age 100+ population doesn't explode
4. Validate economic metrics are within expected ranges
5. Compare with INE/Eurostat projections where available

## Expected Outcomes

- **Phase 1-2**: Eliminate critical bugs causing incorrect population counts
- **Phase 3**: More realistic economic projections (±10% accuracy improvement)
- **Phase 4**: Better demographic realism for extreme scenarios
- **Phase 5**: Improved developer experience and error detection

## Notes

- All changes maintain backward compatibility with existing parameter interfaces
- New features (migration scaling, fertility timing) are opt-in or use sensible defaults
- Performance impact should be minimal (<5% increase in computation time)
