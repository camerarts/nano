import { GoogleGenAI } from "@google/genai";

const getClient = () => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        console.warn("API_KEY not found in environment variables. Gemini features will not work.");
        return null;
    }
    return new GoogleGenAI({ apiKey });
};

export const optimizePrompt = async (rawInput: string): Promise<string> => {
  const ai = getClient();
  if (!ai) return "Error: API Key missing. Please configure your environment.";

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `You are an expert prompt engineer for generative AI (specifically image generation models like Midjourney, Stable Diffusion, or Gemini Image). 
      
      User Input: "${rawInput}"
      
      Task: Rewrite and expand the user's input into a high-quality, detailed, descriptive prompt. 
      Include details about lighting, style, camera angle, composition, and texture.
      Keep it essentially English, but if the user input is another language, you can interpret the intent and output the optimized prompt in English (as most image models prefer English).
      
      Return ONLY the optimized prompt text. No explanations.`,
    });

    return response.text?.trim() || "Failed to generate prompt.";
  } catch (error) {
    console.error("Gemini optimization failed:", error);
    return "Error connecting to AI service. Please try again later.";
  }
};