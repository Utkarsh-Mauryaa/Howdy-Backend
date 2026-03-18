import { GoogleGenAI } from "@google/genai";

const TONE_PROMPTS = {
  friendly: `You are a warm, caring messaging assistant.`,

  professional: `You are a professional, polished messaging assistant.`,

  casual: `You are a chill, casual messaging assistant.`,
};

export const getAISuggestions = async (req, res) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const { messages, tone = "friendly" } = req.body;

    
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ message: "Messages array is required" });
    }

    if (!["friendly", "professional", "casual"].includes(tone)) {
      return res.status(400).json({
        message: "Invalid tone. Use: friendly, professional, or casual",
      });
    }

    const recentMessages = messages.slice(-8);

    const conversationText = recentMessages
      .map((m) => `${m.sender}: ${m.content}`)
      .join("\n");

    const prompt = `${TONE_PROMPTS[tone]}

Conversation (You = current user):
${conversationText}

Reply as "You". Give 3 short suggestions (max 10 words each).
Return ONLY a JSON array: ["reply1", "reply2", "reply3"]`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const responseText = response.text.trim();

    
    let suggestions;
    try {
      const cleaned = responseText.replace(/```json|```/g, "").trim();
      suggestions = JSON.parse(cleaned);

      if (!Array.isArray(suggestions) || suggestions.length === 0) {
        throw new Error("Invalid suggestions format");
      }

      suggestions = suggestions.slice(0, 3);
    } catch {
      const match = responseText.match(/\[.*\]/s);
      if (match) {
        suggestions = JSON.parse(match[0]).slice(0, 3);
      } else {
        throw new Error("Could not parse AI response");
      }
    }

    return res.status(200).json({ suggestions, tone });
  } catch (error) {
    console.error("AI Suggestions Error:", error.message);
    return res.status(500).json({
      message: "Failed to generate suggestions",
      error: error.message,
    });
  }
};
