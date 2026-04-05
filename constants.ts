
export const API_KEY = process.env.GEMINI_API_KEY;

export const GEMINI_MODEL_TEXT_FLASH = 'gemini-3-flash-preview';
export const GEMINI_MODEL_TEXT_FLASH_LITE = 'gemini-3.1-flash-lite-preview';
export const GEMINI_MODEL_TEXT_PRO = 'gemini-3.1-pro-preview';
export const GEMINI_MODEL_IMAGE_FLASH = 'gemini-2.5-flash-image';
export const GEMINI_MODEL_TTS = 'gemini-2.5-flash-preview-tts';
export const GEMINI_MODEL_LIVE_AUDIO = 'gemini-3.1-flash-live-preview';

// Audio settings for Live API
export const INPUT_AUDIO_SAMPLE_RATE = 16000; // Microphone input
export const OUTPUT_AUDIO_SAMPLE_RATE = 24000; // Gemini output
export const AUDIO_CHUNK_SIZE = 4096; // ScriptProcessorNode buffer size
export const AUDIO_CHANNELS = 1; // Mono audio
export const LIVE_API_VOICE_NAME = 'Zephyr'; // Default voice for Live API
export const TTS_VOICE_NAME = 'Kore'; // Recommended voice for Text-to-Speech model
