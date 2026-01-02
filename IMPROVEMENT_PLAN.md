# Portugal Demographics Simulator - Accuracy Improvement Plan

## Goal
Transform the simulator into a policy-grade projection system that accurately shows the real burden working Portuguese citizens will face supporting an aging population.

---

## Current Implementation Gaps

### 1. ✅ Population Data - SOLVED
**Was**: Parametric model using invented piecewise functions
**Now**: Real INE 2024 population by single year of age and sex (10,749,635 total)
**Files**: `data/population2024.ts`

### 2. ✅ Mortality Model - SOLVED
**Was**: Simplified Gompertz with arbitrary constants
**Now**: INE life tables with qx values by age, configurable mortality improvement factor (0-2%)
**Files**: `data/lifeTables.ts`, `utils/simulation.ts`

### 3. ✅ Fertility Model - SOLVED
**Was**: Uniform TFR distribution across ages 15-49
**Now**: Age-specific fertility rates (ASFR) from INE, peaking at ages 30-34
**Files**: `data/fertilityRates.ts`, `utils/simulation.ts`

### 4. ✅ Migration Model - SOLVED
**Was**: Flat distribution across ages 18-45
**Now**: Age-sex specific migration profiles from INE, peak at ages 25-34
**Files**: `data/migrationProfile.ts`, `utils/simulation.ts`

### 5. Economic Burden (Critical Gap) - PENDING
**Current**: Only old-age dependency ratio
**Missing**:
- Employment rates (not everyone 15-65 works)
- Social Security financial model (34.75% contribution rate)
- Healthcare cost curve (65+ spends 4x more)
- Per-worker burden calculation

---

## Implementation Phases

### Phase 1: Real Demographic Data ✅ COMPLETE
1. ✅ Download INE 2024 population pyramid data
2. ✅ Download INE life tables (2021-2023 triennium)
3. ✅ Obtain age-specific fertility rates from INE
4. ✅ Create JSON data files with proper structure
5. ✅ Replace parametric model with real data lookup

### Phase 2: Accurate Projection Model ✅ COMPLETE
1. ✅ Implement proper cohort-component method
2. ✅ Add mortality improvement factor (configurable)
3. ✅ Implement ASFR-based birth calculation
4. ✅ Create realistic migration age profiles
5. ✅ Add scenario support (low/medium/high) - Low/Medium/High/Custom presets

### Phase 3: Economic Layer
1. Add employment rates by age (from PORDATA)
2. Model Social Security contributions/payments
3. Add healthcare cost curve by age
4. Calculate per-worker burden metric
5. Add system sustainability projections

### Phase 4: Enhanced Visualizations
1. Per-Worker Burden Chart (€/year per worker)
2. Social Security Balance (contributions vs payments)
3. Sustainability Timeline
4. Scenario Comparison
5. Healthcare Expenditure projections

---

## Data Sources

| Data | Source | URL |
|------|--------|-----|
| Population by age/sex | INE | ine.pt |
| Life tables (qx) | INE | ine.pt |
| Fertility rates (ASFR) | INE | ine.pt |
| Employment rates | PORDATA | pordata.pt |
| Pension statistics | Segurança Social | seg-social.pt |
| Healthcare costs | OECD | oecd.org/health |
| Migration data | INE/SEF | ine.pt |

---

## Key Reference Values (2024)

- **Population**: 10,749,635 (5,140,276 M / 5,609,359 F)
- **Median age**: 47.3 years
- **TFR**: 1.40 children per woman
- **Life expectancy at birth**: 81.49 years (78.73 M / 83.96 F)
- **Aging ratio**: 192.4 elderly per 100 young
- **SS contribution rate**: 34.75% (11% employee + 23.75% employer)
- **Pension replacement rate**: ~69%
- **Retirement age**: 66 years 5 months (2025)

---

## Expected Accuracy Improvements

| Metric | Before | After | Status |
|--------|--------|-------|--------|
| 2024 Population | ~10.4M (estimated) | 10,749,635 (exact) | ✅ Done |
| Life expectancy | Undefined | 81.49 years (calibrated) | ✅ Done |
| Fertility distribution | Uniform 15-49 | ASFR curve peaking 30-34 | ✅ Done |
| Migration profile | Flat 18-45 | Realistic 20-35 peak | ✅ Done |
| Mortality improvement | Hardcoded 1% | Configurable 0-2% via scenarios | ✅ Done |
| Projection scenarios | None | Low/Medium/High/Custom presets | ✅ Done |
| Economic burden | Dependency ratio | €/worker/year with SS balance | Phase 3 |
