import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import HolographicButton from '../components/HolographicButton'; // Import HolographicButton
import {
  startChatSession,
  sendMessageToChat,
  generateSpeech,
  playAudio,
  ensureApiKeySelected,
} from '../services/geminiService';
import { ChatMessage } from '../types';
import { GEMINI_MODEL_TEXT_PRO } from '../constants';

interface CodingChallenge {
  id: number;
  title: string;
  description: string;
  example: string;
}

const CODING_CHALLENGES: CodingChallenge[] = [
  {
    id: 1,
    title: "Two Sum",
    description: "Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`. You may assume that each input would have exactly one solution, and you may not use the same element twice. You can return the answer in any order.",
    example: "Input: nums = [2,7,11,15], target = 9\nOutput: [0,1]\nExplanation: Because nums[0] + nums[1] == 9, we return [0, 1]."
  },
  {
    id: 2,
    title: "Reverse String",
    description: "Write a function that reverses a string. The input string is given as an array of characters `char[]`. Do not allocate extra space for another array, you must do this by modifying the input array in-place with O(1) extra memory.",
    example: "Input: [\"h\",\"e\",\"l\",\"l\",\"o\"]\nOutput: [\"o\",\"l\",\"l\",\"e\",\"h\"]"
  },
  {
    id: 3,
    title: "Palindrome Number",
    description: "Given an integer `x`, return `true` if `x` is a palindrome, and `false` otherwise.",
    example: "Input: x = 121\nOutput: true\nExplanation: 121 reads as 121 from left to right and from right to left."
  },
];

const TechnicalInterview: React.FC = () => {
  const navigate = useNavigate();
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [currentChallengeIndex, setCurrentChallengeIndex] = useState(0);
  const [userCode, setUserCode] = useState<string>('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [apiKeyPromptVisible, setApiKeyPromptVisible] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('JavaScript'); // New state for selected language

  const askChallengeQuestion = useCallback(async () => {
    setIsLoading(true);
    const challenge = CODING_CHALLENGES[currentChallengeIndex];
    const initialPrompt = `Hello, I will provide you with a coding challenge. Please solve it and then I will review your solution. Here is your first challenge:\n\n**${challenge.title}**\n\n${challenge.description}\n\nExample:\n\`\`\`\n${challenge.example}\n\`\`\`\n\nPlease provide your solution in a code block.`;
    setChatMessages((prev) => [...prev, { role: 'model', text: initialPrompt }]);
    setIsLoading(false);
  }, [currentChallengeIndex]);

  const startInterview = async () => {
    const hasKey = await ensureApiKeySelected();
    if (!hasKey) {
      setApiKeyPromptVisible(true);
      return;
    }
    setApiKeyPromptVisible(false);
    setInterviewStarted(true);
    await startChatSession(
      `You are an AI technical interviewer. You will evaluate the user's code, which will be provided in ${selectedLanguage}. Provide a coding challenge, then evaluate the user's code for correctness, efficiency, and best practices. If the code is not perfect, provide constructive feedback and suggest improvements. Speak clearly and professionally. Use markdown for code examples.`,
      GEMINI_MODEL_TEXT_PRO
    );
  };

  useEffect(() => {
    if (interviewStarted && currentChallengeIndex >= 0 && currentChallengeIndex < CODING_CHALLENGES.length) {
      askChallengeQuestion();
    }
  }, [interviewStarted, currentChallengeIndex, askChallengeQuestion]);


  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const handleSubmitCode = async () => {
    if (!userCode.trim()) {
      alert("Please enter your code before submitting.");
      return;
    }

    setIsLoading(true);
    const userMessage = `Here is my solution in ${selectedLanguage}:\n\`\`\`${selectedLanguage.toLowerCase()}\n${userCode}\n\`\`\n\nPlease evaluate it.`;
    setChatMessages((prev) => [...prev, { role: 'user', text: userMessage }]);
    setUserCode(''); // Clear input

    try {
      const responseStream = await sendMessageToChat(userMessage);
      let fullResponseText = '';
      for await (const chunk of responseStream) {
        fullResponseText += chunk.text;
        setChatMessages((prevMessages) => {
          const lastMessage = prevMessages[prevMessages.length - 1];
          // Check if last message is from model and ends with a '|' (typing indicator)
          if (lastMessage && lastMessage.role === 'model' && lastMessage.text.endsWith('|')) {
            const updatedMessages = [...prevMessages];
            updatedMessages[prevMessages.length - 1] = { ...lastMessage, text: lastMessage.text.slice(0, -1) + chunk.text + '|' };
            return updatedMessages;
          } else {
            // If not, add a new message with typing indicator
            return [...prevMessages, { role: 'model', text: chunk.text + '|' }];
          }
        });
      }
      // Remove the last '|' (typing indicator) once streaming is complete
      setChatMessages((prevMessages) => {
        const lastMessage = prevMessages[prevMessages.length - 1];
        if (lastMessage && lastMessage.role === 'model') {
          return [...prevMessages.slice(0, -1), { ...lastMessage, text: lastMessage.text.slice(0, -1) }];
        }
        return prevMessages;
      });
    } catch (error) {
      console.error("Error evaluating code:", error);
      setChatMessages((prev) => [...prev, { role: 'model', text: "I encountered an error while evaluating your code. Please try again or check your API key." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNextChallenge = async () => {
    if (currentChallengeIndex < CODING_CHALLENGES.length - 1) {
      setCurrentChallengeIndex((prev) => prev + 1);
      setChatMessages([]); // Clear chat history for the new challenge
      await startChatSession(
        `You are an AI technical interviewer. You will evaluate the user's code, which will be provided in ${selectedLanguage}. Provide a coding challenge, then evaluate the user's code for correctness, efficiency, and best practices. If the code is not perfect, provide constructive feedback and suggest improvements. Speak clearly and professionally. Use markdown for code examples.`,
        GEMINI_MODEL_TEXT_PRO
      );
    } else {
      setChatMessages((prev) => [...prev, { role: 'model', text: "You have completed all technical challenges. Good job!" }]);
      setTimeout(() => navigate('/skill-builder'), 5000); // Changed to skill-builder
    }
  };

  return (
    <div className="relative min-h-screen w-screen flex flex-col items-center bg-gradient-to-br from-black to-blue-950 text-white font-['Michroma'] overflow-hidden p-8">
      <div className="absolute top-8 left-8 text-emerald-400 text-lg cursor-pointer hover:text-emerald-200 transition-colors duration-300 z-50" onClick={() => navigate('/skill-builder')}>
        &lt; Back to Skill Builder
      </div>

      <h1 className="text-4xl text-emerald-400 drop-shadow-[0_0_15px_rgba(0,255,200,0.5)] mt-16 mb-8">
        Technical Interview
      </h1>

      {!interviewStarted ? (
        <div className="flex flex-col items-center mt-10 p-8 bg-blue-900/10 border border-blue-500/30 rounded-lg shadow-lg shadow-blue-500/10 backdrop-blur-md animate-fade-in max-w-2xl">
          <p className="text-lg text-blue-100 mb-6 text-center leading-relaxed">
            Tackle coding challenges and receive AI-powered feedback on your solutions. You will be presented with a LeetCode-style problem.
          </p>
          <div className="w-full mb-6">
            <label htmlFor="coding-language" className="block text-blue-300 text-sm font-bold mb-2">
              Select Coding Language:
            </label>
            <select
              id="coding-language"
              className="w-full p-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              aria-label="Select Coding Language"
              disabled={isLoading}
            >
              <option value="JavaScript">JavaScript</option>
              <option value="Python">Python</option>
              <option value="Java">Java</option>
              <option value="C++">C++</option>
              <option value="C#">C#</option>
            </select>
          </div>
          <HolographicButton
            onClick={startInterview}
            size="default" // Use default size for primary action button
          >
            Start Challenges
          </HolographicButton>
        </div>
      ) : (
        <div className="flex flex-col w-full max-w-5xl h-[calc(100vh-180px)] mt-4">
          <div ref={chatContainerRef} className="flex-1 bg-blue-900/10 border border-blue-500/30 rounded-lg shadow-lg shadow-blue-500/10 backdrop-blur-md p-4 overflow-y-auto custom-scrollbar flex flex-col space-y-4 mb-4">
            {chatMessages.map((msg, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg shadow-md max-w-[80%] whitespace-pre-wrap ${
                  msg.role === 'user' ? 'bg-blue-700/50 self-end ml-auto' : 'bg-emerald-700/50 self-start mr-auto'
                }`}
              >
                <span className={`${msg.role === 'user' ? 'text-blue-100' : 'text-emerald-100'}`}>
                  {msg.text}
                </span>
              </div>
            ))}
            {isLoading && (
              <div className="p-3 rounded-lg shadow-md max-w-[80%] bg-emerald-700/50 self-start mr-auto">
                <span className="text-emerald-100 animate-pulse">AI is thinking...</span>
              </div>
            )}
          </div>
          <div className="flex flex-col md:flex-row gap-4">
            <textarea
              className="flex-1 p-4 bg-gray-800/50 border border-gray-600 rounded-lg text-white font-mono placeholder-gray-400 focus:outline-none focus:border-blue-500 min-h-[100px] md:min-h-0"
              placeholder={`Write your code in ${selectedLanguage} here...`}
              value={userCode}
              onChange={(e) => setUserCode(e.target.value)}
              rows={5}
            ></textarea>
            <div className="flex flex-col md:flex-row gap-4 flex-shrink-0">
              <HolographicButton
                onClick={handleSubmitCode}
                disabled={isLoading || !userCode.trim()}
                size="default"
              >
                {isLoading ? 'Submitting...' : 'Submit Code'}
              </HolographicButton>
              {currentChallengeIndex < CODING_CHALLENGES.length - 1 && (
                <HolographicButton
                  onClick={handleNextChallenge}
                  disabled={isLoading}
                  size="default"
                >
                  Next Challenge
                </HolographicButton>
              )}
              {currentChallengeIndex === CODING_CHALLENGES.length - 1 && (
                <HolographicButton
                  onClick={() => navigate('/skill-builder')}
                  className="bg-red-600 hover:bg-red-700"
                  size="default"
                >
                  Finish Interview
                </HolographicButton>
              )}
            </div>
          </div>
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

export default TechnicalInterview;