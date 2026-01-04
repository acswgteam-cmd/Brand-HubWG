import { GoogleGenAI, Type } from "@google/genai";

export const generateAssetMetadata = async (title: string, brandName: string, typeName: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate a concise professional description and 5 relevant tags for a brand asset titled "${title}" belonging to the brand "${brandName}" of type "${typeName}".`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            description: { type: Type.STRING },
            tags: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["description", "tags"]
        }
      }
    });
    
    // Fix: Using .text property and trimming as recommended in the Gemini SDK guidelines, ensuring safe fallback
    const jsonStr = response.text?.trim() || "{}";
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Gemini metadata generation failed", error);
    return {
      description: "Auto-generated asset metadata.",
      tags: [brandName.toLowerCase(), typeName.toLowerCase()]
    };
  }
};
