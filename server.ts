import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

app.use(express.json({ limit: '25mb' }));

// Shared server-side Gemini client
const getAiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in environment.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

// Moroccan Darija mixed with English Tutor System Prompt
const MOROCCAN_TUTOR_SYSTEM_PROMPT = `
You are "أستاذي كمال" (or "أستاذتي إيمان"), an exceptionally charismatic, warm, patient, and modern English language coach.
CRITICAL TEACHING STYLE:
You MUST speak in a lively, natural blend of Moroccan Darija mixed with English (code-switching: الدارجة المغربية مخلطة بالإنجليزية).
Every single reply must blend authentic Moroccan Darija and spoken English naturally!
Examples of your style:
- "تبارك الله عليك bro! Your sentence was actually very good! غير رد البال لـ pronunciation ديال 'three' ماشي 'tree'. Let's say it together: Three!"
- "Hello my friend! كيف داير اليوم؟ How are you doing? دابا يلا بغيتي تكوموندي فـ café كتقول: 'Could I get an espresso, please?' شفتي how simple it is? يلا عاود مورايا دابا!"
- "Good job! ناضي بزاف! فـ English ديما كنقولو 'take your time' باش نقولو للشخص 'على خاطرك وما تزربش'. Repeat after me: Take your time!"

Guidelines:
1. Always keep spoken voice responses CONCISE, fast, punchy, and lively (2-3 short sentences max for voice clarity and instant speed).
2. Code-switch naturally between Darija (دابا، عفاك، تبارك الله عليك، راك غادي ناضي، شوف معايا، بحال هكا) and English phrases.
3. Teach the target English sentence clearly, with simple Arabic phonetics (e.g. "كود آي ڭيت...").
4. Give instant positive reinforcement and prompt the learner to repeat.
`;

// 1. Chat & Conversational Endpoint (Optimized for instant low-latency speed)
app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const { messages, scenario, userLevel = 'beginner', tutorGender = 'male' } = req.body;
    const ai = getAiClient();

    const tutorName = tutorGender === 'female' ? 'أستاذتي إيمان' : 'أستاذي كمال';

    let scenarioContext = '';
    if (scenario && scenario.id !== 'free_chat') {
      scenarioContext = `Scenario: "${scenario.title}" (${scenario.description}). Role: ${scenario.aiRole || 'Coach'}. Goal: ${scenario.userGoal || 'Practice phrases'}.`;
    }

    const systemInstruction = `
${MOROCCAN_TUTOR_SYSTEM_PROMPT}
You are ${tutorName}. Student Level: ${userLevel}.
${scenarioContext}

RULES FOR ULTRA-FAST & NATURAL CONVERSATION:
- Answer in short, punchy Moroccan Darija heavily mixed with English (الدارجة مخلطة بالإنجليزية).
- Keep darijaResponse under 35 words so it speaks quickly without delay!
- Always provide a clear English phrase to practice.
`;

    // Format chat history for contents
    const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

    if (Array.isArray(messages) && messages.length > 0) {
      // Keep only recent context (last 6 messages) for maximum speed and relevance
      const recent = messages.slice(-6);
      for (const m of recent) {
        contents.push({
          role: m.role === 'assistant' || m.role === 'model' ? 'model' : 'user',
          parts: [{ text: m.content }],
        });
      }
    } else {
      contents.push({
        role: 'user',
        parts: [{ text: 'Hello أستاذي! سلام، بغيت نبدا نتعلم معاك دابا!' }],
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents,
      config: {
        systemInstruction,
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.LOW,
        },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            darijaResponse: { type: Type.STRING, description: 'Lively Moroccan Darija mixed with English (under 35 words)' },
            englishPhrase: { type: Type.STRING, description: 'Key English phrase to say' },
            phoneticArabic: { type: Type.STRING, description: 'Phonetic guide in Moroccan Arabic script' },
            vocabulary: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  english: { type: Type.STRING },
                  darija: { type: Type.STRING },
                },
                required: ['english', 'darija'],
              },
            },
            suggestedUserReplies: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: ['darijaResponse', 'englishPhrase'],
        },
      },
    });

    const text = response.text || '{}';
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = {
        darijaResponse: text,
        englishPhrase: 'How are you doing today?',
        phoneticArabic: 'هاو آر يو دوينڭ توداي؟',
        vocabulary: [{ english: 'Doing great', darija: 'غادي مزيان بزاف' }],
        suggestedUserReplies: ['I am doing great!', 'Could you repeat please?'],
      };
    }

    // Generate speech audio directly so the client receives text + audio together
    let audioBase64: string | null = null;
    try {
      const voiceName = tutorGender === 'female' ? 'Kore' : 'Puck';
      const speechPrompt = `${data.englishPhrase || ''}. ${data.darijaResponse || ''}`.trim();
      
      const ttsResponse = await ai.models.generateContent({
        model: 'gemini-3.8-flash-lite-tts',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `Say with a natural, friendly Moroccan bilingual tone: ${speechPrompt}`,
                speechMetadata: {
                  style: 'Warm and encouraging bilingual language coach',
                },
              },
            ],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName },
            },
          },
        },
      });

      audioBase64 = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
    } catch (ttsErr) {
      console.warn('Direct chat TTS generation skipped, client will use fallback:', ttsErr);
    }

    return res.json({ success: true, data, audioBase64 });
  } catch (error: any) {
    console.error('Error in /api/chat:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to process chat message',
    });
  }
});

// 2. Text-to-Speech generation with gemini-3.8-flash-lite-tts
app.post('/api/tts', async (req: Request, res: Response) => {
  try {
    const { text, voice = 'Puck', speed = 1.0, lang = 'en' } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ success: false, error: 'Text is required for TTS' });
    }

    const ai = getAiClient();

    // Voice options: 'Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'
    // Puck and Kore are very natural voices
    const selectedVoice = voice || 'Puck';

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: lang === 'en'
                ? `Say clearly with a friendly, natural American English tutor tone: ${text}`
                : `Say with a warm, encouraging Moroccan Arabic / Darija conversational accent: ${text}`,
              speechMetadata: {
                style: lang === 'en' ? 'Friendly and clear English language tutor' : 'Warm and natural Moroccan voice',
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: selectedVoice },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      throw new Error('No audio returned from TTS model');
    }

    return res.json({
      success: true,
      audioBase64: base64Audio,
      mimeType: 'audio/wav',
    });
  } catch (error: any) {
    console.error('Error in /api/tts:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to synthesize speech',
    });
  }
});

// 3. Audio Transcription with gemini-3.5-transcribe
app.post('/api/transcribe', async (req: Request, res: Response) => {
  try {
    const { audioBase64, mimeType = 'audio/webm' } = req.body;
    if (!audioBase64) {
      return res.status(400).json({ success: false, error: 'audioBase64 is required' });
    }

    const ai = getAiClient();

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-transcribe',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType,
              data: audioBase64,
            },
          },
          {
            text: 'Transcribe this audio recording accurately. The speaker might be speaking Moroccan Darija (Arabic), English, or code-switching between Darija and English. Return only the transcription.',
          },
        ],
      },
    });

    const transcription = response.text?.trim() || '';
    return res.json({ success: true, transcription });
  } catch (error: any) {
    console.error('Error in /api/transcribe:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to transcribe audio',
    });
  }
});

// 4. Pronunciation Evaluation Endpoint
app.post('/api/pronunciation-check', async (req: Request, res: Response) => {
  try {
    const { targetPhrase, spokenText, audioBase64, mimeType = 'audio/webm' } = req.body;
    const ai = getAiClient();

    let userTranscript = spokenText;

    // If audio is provided but no spokenText, transcribe it first
    if (!userTranscript && audioBase64) {
      const transcribeRes = await ai.models.generateContent({
        model: 'gemini-3.5-transcribe',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType,
                data: audioBase64,
              },
            },
            {
              text: `Transcribe what the user said in English attempting to pronounce: "${targetPhrase}".`,
            },
          ],
        },
      });
      userTranscript = transcribeRes.text?.trim() || '';
    }

    const prompt = `
You are an expert English pronunciation coach evaluating a Moroccan student.
Target phrase: "${targetPhrase}"
What the student said: "${userTranscript || '(inaudible / silence)'}"

Analyze the pronunciation and provide feedback in Moroccan Darija.
Evaluate:
1. Accuracy score from 0 to 100
2. Specific sounds/letters that Moroccan learners often stumble on (e.g., P vs B, TH, R, vowels, ending consonants)
3. Actionable tip in Darija on how to place the tongue or lips
4. Warm encouragement in Darija
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.LOW,
        },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.INTEGER, description: 'Score between 0 and 100' },
            rating: { type: Type.STRING, description: 'Excellent, Good, Needs Practice, or Try Again' },
            heardText: { type: Type.STRING, description: 'What was heard' },
            darijaFeedback: { type: Type.STRING, description: 'Detailed feedback in Moroccan Darija' },
            pronunciationTips: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Tips in Darija for tricky sounds',
            },
            encouragement: { type: Type.STRING, description: 'Moroccan praise or cheer' },
          },
          required: ['score', 'rating', 'darijaFeedback'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({ success: true, data: { ...parsed, heardText: userTranscript } });
  } catch (error: any) {
    console.error('Error in /api/pronunciation-check:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to check pronunciation',
    });
  }
});

// 5. Generate Practice Quiz Questions
app.post('/api/quiz/generate', async (req: Request, res: Response) => {
  try {
    const { category = 'daily_conversation', level = 'beginner' } = req.body;
    const ai = getAiClient();

    const prompt = `
Generate 4 engaging interactive English quiz questions for Moroccan students learning English through Moroccan Darija.
Level: ${level}
Topic: ${category}

Questions should test:
- Translating a common Moroccan Darija thought into proper English
- Picking the right response in a real-life situation
- Pronunciation or vocabulary meaning
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              questionDarija: { type: Type.STRING, description: 'Question in Darija' },
              situation: { type: Type.STRING, description: 'Context in Darija' },
              targetEnglish: { type: Type.STRING, description: 'Target sentence' },
              options: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '4 multiple choice options in English',
              },
              correctAnswerIndex: { type: Type.INTEGER, description: '0 to 3 index' },
              explanationDarija: { type: Type.STRING, description: 'Explanation why in Darija' },
              phoneticGuide: { type: Type.STRING, description: 'Pronunciation in Moroccan Arabic letters' },
            },
            required: ['id', 'questionDarija', 'options', 'correctAnswerIndex', 'explanationDarija'],
          },
        },
      },
    });

    const questions = JSON.parse(response.text || '[]');
    return res.json({ success: true, questions });
  } catch (error: any) {
    console.error('Error in /api/quiz/generate:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate quiz',
    });
  }
});

// Setup Vite middlewares in development or static serving in production
async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
