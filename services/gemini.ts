import { GoogleGenAI, Type } from "@google/genai";
import { Goal } from '../types';

// Initialize the Gemini AI client
// The API key must be available in process.env.API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export interface DailyFeedback {
  score: number;
  message: string;
  tone: 'danger' | 'warning' | 'success';
}

export const generateDailyReport = async (
  goals: Goal[],
  userName: string
): Promise<DailyFeedback> => {
  const completed = goals.filter((g) => g.completed);
  const missed = goals.filter((g) => !g.completed);
  const completionRate = goals.length > 0 ? completed.length / goals.length : 0;

  const prompt = `
    Student Name: ${userName}
    Total Goals Set: ${goals.length}
    Completed Goals: ${completed.map((g) => g.text).join(', ')}
    Missed Goals: ${missed.map((g) => g.text).join(', ')}

    Task:
    1. Calculate a score out of 100 based on completion and difficulty (assume average difficulty).
    2. Provide a short feedback message (max 50 words).
    3. If the score is low (below 50), the tone should be strict and warning ("danger"). If medium (50-80), encouraging ("warning"). If high (80+), congratulatory ("success").
    
    Return JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER },
            message: { type: Type.STRING },
            tone: { type: Type.STRING, enum: ['danger', 'warning', 'success'] }
          },
          required: ['score', 'message', 'tone']
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as DailyFeedback;
    }
    
    throw new Error("Empty response from AI");

  } catch (error) {
    console.error("Gemini API Error:", error);
    // Fallback logic if AI fails
    let fallbackScore = Math.round(completionRate * 100);
    let fallbackTone: 'danger' | 'warning' | 'success' = 'warning';
    let fallbackMessage = "Daily summary saved.";

    if (fallbackScore < 50) {
      fallbackTone = 'danger';
      fallbackMessage = "You missed too many goals. You need to focus!";
    } else if (fallbackScore >= 80) {
      fallbackTone = 'success';
      fallbackMessage = "Great job today!";
    }

    return {
      score: fallbackScore,
      message: fallbackMessage,
      tone: fallbackTone
    };
  }
};