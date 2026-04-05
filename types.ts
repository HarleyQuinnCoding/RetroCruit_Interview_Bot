

import { LiveServerMessage, Blob, Modality } from "@google/genai";

// The `window.aistudio` object is assumed to be pre-configured and globally available
// by the AI Studio environment, hence no explicit declaration is needed here.
declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface InterviewQuestion {
  id: string;
  question: string;
  type: 'conversational' | 'technical' | 'image';
}

export interface ApiResponse {
  text: string;
  urls?: { uri: string; title?: string }[];
}

export interface AudioProcessorCallbacks {
  onAudioData: (pcmBlob: Blob) => void;
}

export interface AudioPlaybackCallbacks {
  onPlaybackEnd: () => void;
}

export type LiveSessionCallbacks = {
  onopen: () => void;
  onmessage: (message: LiveServerMessage) => Promise<void>;
  onerror: (e: Event) => void;
  onclose: (e: Event) => void;
};

// Utility types for Audio API
export type DecodeFunction = (base64: string) => Uint8Array;
export type DecodeAudioDataFunction = (
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
) => Promise<AudioBuffer>;
export type EncodeFunction = (bytes: Uint8Array) => string;

export interface ToolCall {
  name: string;
  args: Record<string, any>;
  id: string;
}

export enum InterviewType {
  Conversational = 'conversational',
  Technical = 'technical',
  ResumeAnalyzer = 'resume-analyzer', // Renamed from ImageAnalysis
  CombinedMockInterview = 'combined-mock-interview', // New type for combined interview
}