
import { GoogleGenAI, GenerateContentResponse, Chat, Modality, FunctionDeclaration, Type, ThinkingLevel } from "@google/genai";
import { API_KEY, GEMINI_MODEL_TEXT_FLASH, GEMINI_MODEL_IMAGE_FLASH, GEMINI_MODEL_LIVE_AUDIO, GEMINI_MODEL_TTS, INPUT_AUDIO_SAMPLE_RATE, OUTPUT_AUDIO_SAMPLE_RATE, AUDIO_CHANNELS, LIVE_API_VOICE_NAME, GEMINI_MODEL_TEXT_PRO, AUDIO_CHUNK_SIZE, TTS_VOICE_NAME } from '../constants'; // Import TTS_VOICE_NAME
import { LiveSessionCallbacks, ChatMessage, ToolCall } from '../types'; // Removed Blob from types as it's not directly used here.

// Utility functions for audio encoding/decoding, as specified in prompt
const decode: (base64: string) => Uint8Array = (base64: string) => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

const decodeAudioData: (
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
) => Promise<AudioBuffer> = async (
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> => {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
};

const encode: (bytes: Uint8Array) => string = (bytes: Uint8Array) => {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

let ai: GoogleGenAI | null = null;

async function initializeGeminiClient(): Promise<GoogleGenAI> {
  if (!API_KEY) {
    console.warn("API_KEY is not set. Please select an API key in the AI Studio environment.");
    // Fallback or error handling for when API_KEY is not immediately available.
    // In a deployed environment, this would ideally be handled by the runtime.
  }
  // Always create a new instance to ensure the latest API key is used
  return new GoogleGenAI({ apiKey: API_KEY || '' });
}

export const ensureApiKeySelected = async (): Promise<boolean> => {
  if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
    const hasKey = await window.aistudio.hasSelectedApiKey();
    if (!hasKey) {
      alert('Please select your Gemini API key to proceed. A new window will open.');
      if (typeof window.aistudio.openSelectKey === 'function') {
        await window.aistudio.openSelectKey();
        // Assume selection was successful to mitigate race condition
        return true;
      }
      return false;
    }
    return true;
  }
  console.warn("window.aistudio not available. API Key selection UI might be missing.");
  // If aistudio is not available, assume API_KEY is set via environment variable
  return !!API_KEY;
};

export const getGeminiClient = async (): Promise<GoogleGenAI> => {
  if (!ai) {
    ai = await initializeGeminiClient();
  }
  return ai;
};


export const generateText = async (prompt: string, model: string = GEMINI_MODEL_TEXT_FLASH): Promise<GenerateContentResponse> => {
  const client = await getGeminiClient();
  try {
    const response = await client.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }, // For faster responses
      },
    });
    return response;
  } catch (error: any) {
    console.error("Error generating text from Gemini:", error);
    if (error.message && error.message.includes("Requested entity was not found.")) {
      console.error("API Key might be invalid or not selected. Prompting user to select key.");
      await ensureApiKeySelected();
      // Optionally retry once after key selection, or re-throw to let UI handle.
    }
    throw error;
  }
};

export const generateTextStream = async (prompt: string, model: string = GEMINI_MODEL_TEXT_FLASH): Promise<AsyncIterable<GenerateContentResponse>> => {
  const client = await getGeminiClient();
  try {
    const response = await client.models.generateContentStream({
      model: model,
      contents: prompt,
    });
    return response;
  } catch (error: any) {
    console.error("Error generating text stream from Gemini:", error);
    if (error.message && error.message.includes("Requested entity was not found.")) {
      console.error("API Key might be invalid or not selected. Prompting user to select key.");
      await ensureApiKeySelected();
    }
    throw error;
  }
};


export const analyzeResume = async (resumeContent: string | { data: string, mimeType: string }, prompt: string): Promise<GenerateContentResponse> => {
  const client = await getGeminiClient();
  try {
    let contents: any;
    if (typeof resumeContent === 'string') {
      contents = [{ text: `${prompt}\n\nResume Content:\n${resumeContent}` }];
    } else {
      contents = [
        { text: prompt },
        { inlineData: { data: resumeContent.data, mimeType: resumeContent.mimeType } }
      ];
    }
    const response = await client.models.generateContent({
      model: GEMINI_MODEL_TEXT_PRO, // Using a text-focused model for analysis
      contents,
    });
    return response;
  } catch (error: any) {
    console.error("Error analyzing resume with Gemini:", error);
    if (error.message && error.message.includes("Requested entity was not found.")) {
      console.error("API Key might be invalid or not selected. Prompting user to select key.");
      await ensureApiKeySelected();
    }
    throw error;
  }
};

let currentChatSession: Chat | null = null;

export const startChatSession = async (systemInstruction?: string, model: string = GEMINI_MODEL_TEXT_FLASH, chatHistory?: ChatMessage[]): Promise<void> => {
  const client = await getGeminiClient();
  try {
    // Transform ChatMessage[] to the format expected by GenAI (contents: [Content[]])
    const historyParts = chatHistory?.map(msg => ({
      parts: [{ text: msg.text }],
      role: msg.role === 'user' ? 'user' : 'model',
    })) || [];

    currentChatSession = client.chats.create({
      model: model,
      history: historyParts, // Add chat history here
      config: systemInstruction ? { systemInstruction } : undefined,
    });
    console.log("Chat session started.");
  } catch (error: any) {
    console.error("Error starting chat session:", error);
    if (error.message && error.message.includes("Requested entity was not found.")) {
      console.error("API Key might be invalid or not selected. Prompting user to select key.");
      await ensureApiKeySelected();
    }
    throw error;
  }
};

export const sendMessageToChat = async (message: string): Promise<AsyncIterable<GenerateContentResponse>> => {
  if (!currentChatSession) {
    throw new Error("Chat session not started. Call startChatSession first.");
  }
  try {
    const response = await currentChatSession.sendMessageStream({ message });
    return response;
  } catch (error: any) {
    console.error("Error sending message to chat:", error);
    if (error.message && error.message.includes("Requested entity was not found.")) {
      console.error("API Key might be invalid or not selected. Prompting user to select key.");
      await ensureApiKeySelected();
    }
    throw error;
  }
};

// Use Awaited<ReturnType<typeof GoogleGenAI.prototype.live.connect>> to correctly type liveSessionPromise
let liveSessionPromise: Promise<Awaited<ReturnType<typeof GoogleGenAI.prototype.live.connect>>> | null = null;
let liveInputAudioContext: AudioContext | null = null;
let liveOutputAudioContext: AudioContext | null = null;
let mediaStreamSource: MediaStreamAudioSourceNode | null = null;
let scriptProcessor: ScriptProcessorNode | null = null;
let outputNode: GainNode | null = null;
let nextStartTime = 0;
const playingAudioSources = new Set<AudioBufferSourceNode>();

const stopAllAudioPlayback = () => {
  for (const source of playingAudioSources.values()) {
    try {
      source.stop();
    } catch (e) {
      console.warn("Error stopping audio source:", e);
    }
  }
  playingAudioSources.clear();
  nextStartTime = 0;
};

export const connectToLiveSession = async (
  callbacks: LiveSessionCallbacks,
  toolDeclarations?: FunctionDeclaration[],
  systemInstruction?: string, // Added system instruction
): Promise<Awaited<ReturnType<typeof GoogleGenAI.prototype.live.connect>>> => {
  const client = await getGeminiClient();
  if (liveSessionPromise) {
    console.warn("A live session is already in progress.");
    // Close existing session before starting a new one
    try {
      const session = await liveSessionPromise;
      session.close();
    } catch (e) {
      console.error("Error closing existing live session:", e);
    }
    liveSessionPromise = null;
  }

  // Use window.AudioContext for modern browser compatibility
  liveOutputAudioContext = new window.AudioContext({ sampleRate: OUTPUT_AUDIO_SAMPLE_RATE });
  outputNode = liveOutputAudioContext.createGain();
  outputNode.connect(liveOutputAudioContext.destination);

  liveSessionPromise = client.live.connect({
    model: GEMINI_MODEL_LIVE_AUDIO,
    callbacks: {
      onopen: () => {
        console.log("Live session opened.");
        callbacks.onopen();
      },
      onmessage: async (message) => {
        // Handle audio output
        const base64EncodedAudioString = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
        if (base64EncodedAudioString && liveOutputAudioContext && outputNode) {
          nextStartTime = Math.max(nextStartTime, liveOutputAudioContext.currentTime);
          try {
            const audioBuffer = await decodeAudioData(
              decode(base64EncodedAudioString),
              liveOutputAudioContext,
              OUTPUT_AUDIO_SAMPLE_RATE,
              AUDIO_CHANNELS,
            );
            const source = liveOutputAudioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(outputNode);
            source.addEventListener('ended', () => {
              playingAudioSources.delete(source);
            });
            source.start(nextStartTime);
            nextStartTime = nextStartTime + audioBuffer.duration;
            playingAudioSources.add(source);
          } catch (error) {
            console.error("Error decoding or playing audio:", error);
          }
        }

        // Handle transcription
        if (message.serverContent?.outputTranscription) {
          console.debug('Model Output Transcription:', message.serverContent.outputTranscription.text);
        }
        if (message.serverContent?.inputTranscription) {
          console.debug('User Input Transcription:', message.serverContent.inputTranscription.text);
        }

        // Handle tool calls
        if (message.toolCall) {
          console.debug('Function calls received:', message.toolCall.functionCalls);
        }

        // Handle interruption
        if (message.serverContent?.interrupted) {
          console.debug("Live session interrupted by model.");
          stopAllAudioPlayback();
        }
        await callbacks.onmessage(message); // Pass message to UI callbacks
      },
      onerror: (e) => {
        console.error("Live session error:", e);
        callbacks.onerror(e);
        stopAllAudioPlayback();
        liveSessionPromise = null; // Reset session promise on error
      },
      onclose: (e) => {
        console.log("Live session closed.");
        callbacks.onclose(e);
        stopAllAudioPlayback();
        liveSessionPromise = null; // Reset session promise on close
      },
    },
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: LIVE_API_VOICE_NAME } },
      },
      inputAudioTranscription: {},
      outputAudioTranscription: {},
      tools: toolDeclarations ? [{ functionDeclarations: toolDeclarations }] : undefined,
      systemInstruction: systemInstruction, // Pass system instruction to live session
    },
  });
  return liveSessionPromise;
};

export const startAudioInput = async (stream: MediaStream) => {
  if (!liveSessionPromise) {
    throw new Error("Live session not connected. Call connectToLiveSession first.");
  }
  if (liveInputAudioContext) {
    console.warn("Audio input already started.");
    return;
  }

  // Use window.AudioContext for modern browser compatibility
  liveInputAudioContext = new window.AudioContext({ sampleRate: INPUT_AUDIO_SAMPLE_RATE });
  mediaStreamSource = liveInputAudioContext.createMediaStreamSource(stream);
  scriptProcessor = liveInputAudioContext.createScriptProcessor(AUDIO_CHUNK_SIZE, AUDIO_CHANNELS, AUDIO_CHANNELS);

  scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
    const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
    const pcmBlob = {
      data: encode(new Uint8Array(new Int16Array(inputData.map(v => v * 32768)).buffer)),
      mimeType: `audio/pcm;rate=${INPUT_AUDIO_SAMPLE_RATE}`,
    };
    liveSessionPromise?.then((session) => {
      session.sendRealtimeInput({ audio: pcmBlob });
    }).catch(e => console.error("Error sending realtime input:", e));
  };

  mediaStreamSource.connect(scriptProcessor);
  scriptProcessor.connect(liveInputAudioContext.destination);
  console.log("Microphone input started.");
};

export const stopLiveSession = async () => {
  if (liveSessionPromise) {
    try {
      const session = await liveSessionPromise;
      session.close();
    } catch (e) {
      console.error("Error closing live session:", e);
    } finally {
      liveSessionPromise = null;
    }
  }

  if (mediaStreamSource) {
    mediaStreamSource.disconnect();
    mediaStreamSource = null;
  }
  if (scriptProcessor) {
    scriptProcessor.disconnect();
    scriptProcessor.onaudioprocess = null;
    scriptProcessor = null;
  }
  if (liveInputAudioContext) {
    await liveInputAudioContext.close();
    liveInputAudioContext = null;
  }
  if (outputNode) {
    outputNode.disconnect();
    outputNode = null;
  }
  if (liveOutputAudioContext) {
    await liveOutputAudioContext.close();
    liveOutputAudioContext = null;
  }
  stopAllAudioPlayback();
  console.log("Live session and audio inputs stopped.");
};


export const sendToolResponseToLiveSession = async (
  functionCallId: string,
  functionName: string,
  result: any,
) => {
  if (!liveSessionPromise) {
    throw new Error("Live session not connected.");
  }
  try {
    const session = await liveSessionPromise;
    session.sendToolResponse({
      functionResponses: [{
        id: functionCallId,
        name: functionName,
        response: { result: result },
      }]
    });
    console.log(`Sent tool response for ${functionName} (ID: ${functionCallId})`);
  } catch (error) {
    console.error("Error sending tool response:", error);
    throw error;
  }
};

export const generateSpeech = async (text: string): Promise<string> => {
  const client = await getGeminiClient();
  try {
    const response = await client.models.generateContent({
      model: GEMINI_MODEL_TTS,
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: TTS_VOICE_NAME } }, // Use TTS_VOICE_NAME
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      throw new Error("No audio data received from TTS.");
    }
    return base64Audio;
  } catch (error: any) {
    console.error("Error generating speech:", error);
    if (error.message && error.message.includes("Requested entity was not found.")) {
      await ensureApiKeySelected();
    }
    throw error;
  }
};

export const playAudio = async (base64Audio: string): Promise<void> => {
  if (!liveOutputAudioContext) {
    // Use window.AudioContext for modern browser compatibility
    liveOutputAudioContext = new window.AudioContext({ sampleRate: OUTPUT_AUDIO_SAMPLE_RATE });
    outputNode = liveOutputAudioContext.createGain();
    outputNode.connect(liveOutputAudioContext.destination);
  }

  if (!outputNode || !liveOutputAudioContext) {
    console.error("Audio contexts/nodes not initialized for playback.");
    return;
  }

  try {
    const audioBuffer = await decodeAudioData(
      decode(base64Audio),
      liveOutputAudioContext,
      OUTPUT_AUDIO_SAMPLE_RATE,
      AUDIO_CHANNELS,
    );

    const source = liveOutputAudioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(outputNode);

    nextStartTime = Math.max(nextStartTime, liveOutputAudioContext.currentTime);
    source.start(nextStartTime);
    nextStartTime += audioBuffer.duration;
  } catch (error) {
    console.error("Error playing audio:", error);
  }
};
