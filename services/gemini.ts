import { GoogleGenAI } from "@google/genai";
import { YearData, SimulationParams } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getDemographicAnalysis = async (
  data: YearData,
  params: SimulationParams
): Promise<string> => {
  try {
    const prompt = `
      Act as a senior demographic and economic policy expert for Portugal.
      Analyze the following simulated demographic scenario for Portugal in the year ${data.year}.
      
      Simulation Parameters:
      - Retirement Age: ${params.retirementAge}
      - Fertility Rate: ${params.fertilityRate}
      - Net Migration: ${params.netMigration} / year

      Current Stats:
      - Total Population: ${(data.totalPopulation / 1000000).toFixed(2)} Million
      - Old-Age Dependency Ratio: ${data.oldAgeDependencyRatio.toFixed(1)}% (Retirees per 100 workers)
      - Median Age: ${data.medianAge}
      - Retired Population: ${(data.retiredPop / 1000000).toFixed(2)} Million
      - Working Population: ${(data.workingAgePop / 1000000).toFixed(2)} Million

      Provide a concise, 3-sentence high-level summary of the societal and economic mood. 
      Then, provide 3 bullet points on the specific pressure points for the Portuguese economy (Social Security sustainability, Healthcare burden, Labor shortage, etc.).
      Be realistic about the consequences of such a high dependency ratio if it is high (>50%).
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 0 } // Fast response needed
      }
    });

    return response.text || "Unable to generate analysis.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Analysis unavailable due to API error.";
  }
};
