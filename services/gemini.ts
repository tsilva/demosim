import { GoogleGenAI } from "@google/genai";
import { YearData, SimulationParams } from "../types";

// Lazy initialize to avoid crash when API key is not set
let ai: GoogleGenAI | null = null;

const getAI = (): GoogleGenAI | null => {
  if (ai) return ai;
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  ai = new GoogleGenAI({ apiKey });
  return ai;
};

export const getDemographicAnalysis = async (
  data: YearData,
  params: SimulationParams
): Promise<string> => {
  const client = getAI();
  if (!client) {
    return "AI analysis unavailable. Set GEMINI_API_KEY in .env.local to enable this feature.";
  }

  try {
    const formatCurrency = (value: number): string => {
      if (Math.abs(value) >= 1e9) return `${(value / 1e9).toFixed(1)}B EUR`;
      if (Math.abs(value) >= 1e6) return `${(value / 1e6).toFixed(1)}M EUR`;
      return `${value.toLocaleString()} EUR`;
    };

    const prompt = `
      Act as a senior demographic and economic policy expert for Portugal.
      Analyze the following simulated demographic scenario for Portugal in the year ${data.year}.

      Simulation Parameters:
      - Retirement Age: ${params.retirementAge}
      - Fertility Rate: ${params.fertilityRate}
      - Net Migration: ${params.netMigration} / year
      - Workforce Entry Shift: ${params.workforceEntryAgeShift >= 0 ? '+' : ''}${params.workforceEntryAgeShift} years (${params.workforceEntryAgeShift > 0 ? 'later entry due to more education' : params.workforceEntryAgeShift < 0 ? 'earlier entry' : 'baseline'})
      - Unemployment Adjustment: ${params.unemploymentAdjustment >= 0 ? '+' : ''}${(params.unemploymentAdjustment * 100).toFixed(0)}% (${params.unemploymentAdjustment > 0 ? 'higher unemployment' : params.unemploymentAdjustment < 0 ? 'lower unemployment' : 'baseline'})

      Demographic Stats:
      - Total Population: ${(data.totalPopulation / 1000000).toFixed(2)} Million
      - Old-Age Dependency Ratio: ${data.oldAgeDependencyRatio.toFixed(1)}% (Retirees per 100 workers)
      - Median Age: ${data.medianAge}
      - Retired Population: ${(data.retiredPop / 1000000).toFixed(2)} Million
      - Working-Age Population: ${(data.workingAgePop / 1000000).toFixed(2)} Million

      Economic Indicators:
      - Actual Workforce: ${(data.economic.actualWorkforce / 1000000).toFixed(2)} Million (${(data.economic.laborUtilizationRate * 100).toFixed(1)}% labor utilization)
      - Social Security Contributions: ${formatCurrency(data.economic.totalSSContributions)}
      - Pension Payments: ${formatCurrency(data.economic.totalPensionPayments)}
      - SS Balance: ${data.economic.ssBalance >= 0 ? '+' : ''}${formatCurrency(data.economic.ssBalance)} (${data.economic.ssBalance >= 0 ? 'surplus' : 'deficit'})
      - Total Healthcare Cost: ${formatCurrency(data.economic.totalHealthcareCost)}
      - Economic Burden per Worker: ${formatCurrency(data.economic.totalBurdenPerWorker)}/year
      - Sustainability Index: ${data.economic.sustainabilityIndex.toFixed(0)}/100 (${data.economic.sustainabilityIndex < 30 ? 'CRITICAL' : data.economic.sustainabilityIndex < 60 ? 'WARNING' : 'Sustainable'})

      Provide a concise, 3-sentence high-level summary of the societal and economic mood.
      Then, provide 3 bullet points on the specific pressure points for the Portuguese economy, using the actual numbers provided.
      Be realistic about the consequences. If SS balance is negative, emphasize the unsustainability.
      If burden per worker exceeds 15,000 EUR, highlight the strain on the active workforce.
    `;

    const response = await client.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
    });

    return response.text || "Unable to generate analysis.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Analysis unavailable due to API error.";
  }
};
