# Portugal Demographics Simulator - Accuracy Improvement Plan

## Goal
Transform the simulator into a policy-grade projection system that accurately shows the real burden working Portuguese citizens will face supporting an aging population.

---

## Current Implementation Gaps

### 1. Population Data (`simulation.ts:10-62`)
**Current**: Parametric model using invented piecewise functions
**Problem**: Misses actual age pyramid shape, historical cohort effects
**Solution**: Use real 2024 INE population by single year of age and sex (10,749,635 total)

### 2. Mortality Model (`simulation.ts:68-79`)
**Current**: Simplified Gompertz with arbitrary constants (0.096 male, 0.086 female)
**Problems**:
- Not calibrated to Portugal data
- No infant mortality modeling
- No mortality improvement over time
- Doesn't match actual life expectancy: 78.73y (M), 83.96y (F)

**Solution**: Use INE life tables with qx values by age, add mortality improvement factor

### 3. Fertility Model (`simulation.ts:119-125`)
**Current**: Uniform TFR distribution across ages 15-49
**Problems**:
- Real fertility concentrated in ages 25-40
- Mean age at childbirth is 31.6 years
- Current TFR is 1.40 (2024)

**Solution**: Implement age-specific fertility rates (ASFR) from INE

### 4. Migration Model (`simulation.ts:144-156`)
**Current**: Flat distribution across ages 18-45
**Problems**:
- Real migration concentrated in ages 20-35
- Immigration/emigration have different profiles
- Portugal has volatile migration patterns

**Solution**: Age-sex specific migration profiles from INE

### 5. Economic Burden (Critical Gap)
**Current**: Only old-age dependency ratio
**Missing**:
- Employment rates (not everyone 15-65 works)
- Social Security financial model (34.75% contribution rate)
- Healthcare cost curve (65+ spends 4x more)
- Per-worker burden calculation

---

## Implementation Phases

### Phase 1: Real Demographic Data
1. Download INE 2024 population pyramid data
2. Download INE life tables (2021-2023 triennium)
3. Obtain age-specific fertility rates from INE
4. Create JSON data files with proper structure
5. Replace parametric model with real data lookup

### Phase 2: Accurate Projection Model
1. Implement proper cohort-component method
2. Add mortality improvement factor (configurable)
3. Implement ASFR-based birth calculation
4. Create realistic migration age profiles
5. Add scenario support (low/medium/high)

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

| Metric | Current | After |
|--------|---------|-------|
| 2024 Population | ~10.4M (estimated) | 10,749,635 (exact) |
| Life expectancy | Undefined | 81.49 years (calibrated) |
| Fertility distribution | Uniform 15-49 | ASFR curve peaking 30-34 |
| Migration profile | Flat 18-45 | Realistic 20-35 peak |
| Economic burden | Dependency ratio | €/worker/year with SS balance |
