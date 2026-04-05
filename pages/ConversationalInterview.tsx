import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import HolographicButton from '../components/HolographicButton'; // Import HolographicButton
import {
  connectToLiveSession,
  startAudioInput,
  stopLiveSession,
  ensureApiKeySelected,
} from '../services/geminiService';
import { LiveSessionCallbacks, ChatMessage, ToolCall } from '../types';

interface Question {
  id: number;
  text: string;
  type: 'culture' | 'ethical' | 'conceptual';
}

const CONVERSATIONAL_QUESTIONS: Question[] = [
  { id: 1, text: "Tell me about a time you had to adapt to a significant change at work. How did you handle it?", type: "culture" },
  { id: 2, text: "Describe a situation where you had to make a decision without all the necessary information. What was your process?", type: "conceptual" },
  { id: 3, text: "How do you handle disagreements or conflicts within a team?", type: "culture" },
  { id: 4, text: "Imagine you discover a critical bug in a product just before launch that could impact user data. What would you do?", type: "ethical" },
  { id: 5, text: "What motivates you beyond your job responsibilities?", type: "culture" },
  { id: 6, text: "Describe a complex problem you've faced and how you broke it down to solve it.", type: "conceptual" },
  { id: 7, text: "How do you ensure ethical considerations are met when designing new features or products?", type: "ethical" },
  { id: 8, text: "Tell me about a time you failed. What did you learn from it?", type: "culture" },
  { id: 9, text: "How do you stay updated with industry trends and new technologies?", type: "conceptual" },
  { id: 10, text: "You're asked to implement a feature that you believe has negative implications for user privacy. How would you approach this?", type: "ethical" },
];

const ConversationalInterview: React.FC = () => {
  const navigate = useNavigate();
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isMicActive, setIsMicActive] = useState(false);
  const [transcriptions, setTranscriptions] = useState<ChatMessage[]>([]);
  const [apiKeyPromptVisible, setApiKeyPromptVisible] = useState(false);
  const liveSessionRef = useRef<any>(null);

  const [activeInputTranscription, setActiveInputTranscription] = useState<string>('');
  const [activeOutputTranscription, setActiveOutputTranscription] = useState<string>('');
  const currentInputTranscription = useRef<string>('');
  const currentOutputTranscription = useRef<string>('');
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const handleStartInterview = async () => {
    const hasKey = await ensureApiKeySelected();
    if (!hasKey) {
      setApiKeyPromptVisible(true);
      return;
    }
    setApiKeyPromptVisible(false);

    setInterviewStarted(true);
    // Request microphone permission and start Live API session
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      console.log("Microphone permission granted.");

      const callbacks: LiveSessionCallbacks = {
        onopen: async () => {
          setIsMicActive(true);
          await startAudioInput(stream);
          await askQuestion();
        },
        onmessage: async (message) => {
          if (message.serverContent?.outputTranscription) {
            const text = message.serverContent.outputTranscription.text;
            currentOutputTranscription.current += text;
            setActiveOutputTranscription(currentOutputTranscription.current);
          } else if (message.serverContent?.inputTranscription) {
            const text = message.serverContent.inputTranscription.text;
            currentInputTranscription.current += text;
            setActiveInputTranscription(currentInputTranscription.current);
          }
          
          if (message.serverContent?.turnComplete) {
            const userText = currentInputTranscription.current.trim();
            const modelText = currentOutputTranscription.current.trim();

            if (userText || modelText) {
              setTranscriptions((prev) => {
                const newTranscriptions = [...prev];
                if (userText) newTranscriptions.push({ role: 'user', text: userText });
                if (modelText) newTranscriptions.push({ role: 'model', text: modelText });
                return newTranscriptions;
              });
            }

            currentInputTranscription.current = '';
            currentOutputTranscription.current = '';
            setActiveInputTranscription('');
            setActiveOutputTranscription('');
            // After user response, ask next question or end interview (handled by askQuestion itself)
            // This is handled by the model's instruction to say "I'm ready for the next question." etc.
            // The SkillCheckInterviewPage handles this flow, this component is now simpler.
            // If the AI gives feedback then signals ready, that will be handled by the parent
            // or specific logic if this was a standalone component for full convo flow.
            // For now, this component assumes a fixed number of questions and just shows them.
            // In the context of SkillCheckInterviewPage, this logic is superseded.
            if (currentQuestionIndex < CONVERSATIONAL_QUESTIONS.length) {
              askQuestion(); // Manually advance to the next question for this standalone component
            }
          }

          // If toolCall is received, handle it (though no tools are defined for this specific interview type, it's good practice)
          if (message.toolCall && message.toolCall.functionCalls.length > 0) {
            message.toolCall.functionCalls.forEach((fc: ToolCall) => {
              console.log(`Tool Call: ${fc.name} with args:`, fc.args);
              // In a real scenario, you'd execute the function and send tool response
              // sendToolResponseToLiveSession(fc.id, fc.name, "Function executed successfully.");
            });
          }
        },
        onerror: (e) => {
          console.error("Live session error:", e);
          setIsMicActive(false);
          alert("Error during live session. Please try again.");
          stopLiveSessionAndReset();
        },
        onclose: () => {
          console.log("Live session closed.");
          setIsMicActive(false);
          // If we intentionally stop, don't show alert
        },
      };

      const session = await connectToLiveSession(callbacks, []); // No tools for conversational
      liveSessionRef.current = session;
    } catch (error) {
      console.error("Error starting interview:", error);
      alert("Failed to start microphone or connect to AI. Please ensure microphone access is granted.");
      setInterviewStarted(false);
    }
  };

  const stopLiveSessionAndReset = useCallback(async () => {
    await stopLiveSession();
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    setIsMicActive(false);
    setInterviewStarted(false);
    setTranscriptions([]);
    setCurrentQuestionIndex(0);
    currentInputTranscription.current = '';
    currentOutputTranscription.current = '';
  }, []);

  const askQuestion = useCallback(async () => {
    if (currentQuestionIndex < CONVERSATIONAL_QUESTIONS.length) {
      const question = CONVERSATIONAL_QUESTIONS[currentQuestionIndex].text;
      setTranscriptions((prev) => [...prev, { role: 'model', text: question }]);
      
      // Send the question to the live session as input for the AI to process.
      // We need to get the session from the service or store it in a ref.
      // Since connectToLiveSession returns the session, we should store it.
      if (liveSessionRef.current) {
        liveSessionRef.current.sendRealtimeInput({ text: question });
      }
      
      setCurrentQuestionIndex((prev) => prev + 1);
    } else {
      setTranscriptions((prev) => [...prev, { role: 'model', text: "That concludes the conversational interview. Thank you for your responses." }]);
      await stopLiveSessionAndReset();
      setTimeout(() => navigate('/skill-builder'), 5000); // Redirect after a delay
    }
  }, [currentQuestionIndex, navigate, stopLiveSessionAndReset]);

  useEffect(() => {
    // Cleanup on component unmount
    return () => {
      stopLiveSessionAndReset();
    };
  }, [stopLiveSessionAndReset]);

  return (
    <div className="relative min-h-screen w-screen flex flex-col items-center bg-gradient-to-br from-black to-blue-950 text-white font-['Michroma'] overflow-hidden p-8">
      <div className="absolute top-8 left-8 text-emerald-400 text-lg cursor-pointer hover:text-emerald-200 transition-colors duration-300 z-50" onClick={() => { stopLiveSessionAndReset(); navigate('/skill-builder'); }}>
        &lt; Back to Skill Builder
      </div>

      <h1 className="text-4xl text-emerald-400 drop-shadow-[0_0_15px_rgba(0,255,200,0.5)] mt-16 mb-8">
        Conversational Interview
      </h1>

      {!interviewStarted ? (
        <div className="flex flex-col items-center mt-10 p-8 bg-blue-900/10 border border-blue-500/30 rounded-lg shadow-lg shadow-blue-500/10 backdrop-blur-md animate-fade-in max-w-2xl">
          <p className="text-lg text-blue-100 mb-6 text-center leading-relaxed">
            Engage in a real-time audio conversation with our AI. You will be asked 10 questions focusing on culture, ethics, and conceptual thinking. Please enable your microphone.
          </p>
          <HolographicButton
            onClick={handleStartInterview}
            size="default" // Use default size for primary action button
          >
            Start Interview
          </HolographicButton>
        </div>
      ) : (
        <div className="flex flex-col items-center w-full max-w-4xl mt-4">
          <div className="w-full h-[60vh] md:h-[70vh] bg-blue-900/10 border border-blue-500/30 rounded-lg shadow-lg shadow-blue-500/10 backdrop-blur-md p-4 overflow-y-auto custom-scrollbar flex flex-col space-y-4">
            {transcriptions.map((msg, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg shadow-md max-w-[80%] ${
                  msg.role === 'user' ? 'bg-blue-700/50 self-end ml-auto' : 'bg-emerald-700/50 self-start mr-auto'
                }`}
              >
                <span className={`${msg.role === 'user' ? 'text-blue-100' : 'text-emerald-100'}`}>
                  {msg.text}
                </span>
              </div>
            ))}
            {isMicActive && activeInputTranscription && (
                <div className="p-3 rounded-lg shadow-md max-w-[80%] bg-blue-700/50 self-end ml-auto">
                    <span className="text-blue-100">
                        {activeInputTranscription}<span className="inline-block w-1 h-4 bg-blue-100 animate-pulse ml-1"></span>
                    </span>
                </div>
            )}
            {isMicActive && activeOutputTranscription && (
                <div className="p-3 rounded-lg shadow-md max-w-[80%] bg-emerald-700/50 self-start mr-auto">
                    <span className="text-emerald-100">
                        {activeOutputTranscription}<span className="inline-block w-1 h-4 bg-emerald-100 animate-pulse ml-1"></span>
                    </span>
                </div>
            )}
          </div>
          <p className="text-sm mt-4 text-gray-400">
            {isMicActive ? 'Microphone Active, AI Listening...' : 'Connecting to AI...'}
          </p>
          <HolographicButton
            onClick={stopLiveSessionAndReset}
            className="mt-6 bg-red-600 hover:bg-red-700" // Apply red styling
            size="default" // Use default size
          >
            End Interview
          </HolographicButton>
        </div>
      )}

      {/* API Key Prompt Modal */}
      {apiKeyPromptVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-[1000]">
          <div className="bg-gradient-to-br from-blue-900 to-indigo-900 p-8 rounded-lg shadow-2xl border border-blue-500/50 max-w-md text-center">
            <h3 className="text-xl font-bold mb-4 text-blue-300">API Key Required</h3>
            <p className="text-blue-100 mb-6">
              Please select your Gemini API key in the AI Studio environment to continue.
            </p>
            <p className="text-blue-200 text-sm mb-4">
              <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                Learn more about Gemini API billing.
              </a>
            </p>
            <button
              onClick={() => setApiKeyPromptVisible(false)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors duration-300 text-base"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConversationalInterview;