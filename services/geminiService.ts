
import { GoogleGenAI } from "@google/genai";
import { Transaction } from "../types.ts";

/**
 * Service to interact with Gemini AI for financial insights.
 */
export const getFinancialInsights = async (transactions: Transaction[]): Promise<string> => {
  if (transactions.length === 0) return "加入一些交易記錄來獲得「森活科技 FutureFlow」為您提供的專屬 AI 理財建議！";

  // Use named parameter for GoogleGenAI initialization
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const summaryData = transactions.map(t => ({
    type: t.type,
    category: t.category,
    amount: t.amount,
    note: t.note,
    date: t.date
  }));

  const prompt = `
    你現在是「森活科技 FutureFlow」的首席 AI 理財專家。
    請分析以下使用者的財務交易記錄，並提供 3-4 條具體、具備專業洞察力且口吻溫暖的理財建議。
    請特別關注現金流預測與負債平衡。
    
    交易記錄：
    ${JSON.stringify(summaryData)}
    
    請使用繁體中文，語氣需展現出 FutureFlow「洞察財富未來，掌控流動生機」的品牌精神。
  `;

  try {
    // Select gemini-3-pro-preview for complex reasoning tasks like financial analysis
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        temperature: 0.7,
      }
    });

    // Access .text property directly (do not call as a function)
    return response.text || "目前無法生成建議，請稍後再試。";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "FutureFlow AI 暫時忙碌中，請稍後再試。";
  }
};
