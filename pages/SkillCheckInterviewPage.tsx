import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import HolographicButton from '../components/HolographicButton';
import {
  ensureApiKeySelected,
  connectToLiveSession,
  startAudioInput,
  stopLiveSession,
  sendMessageToChat,
  generateSpeech,
  playAudio,
  startChatSession,
} from '../services/geminiService';
import { LiveSessionCallbacks, ChatMessage } from '../types';
import { GEMINI_MODEL_TEXT_PRO } from '../constants';
import TypingEffect from '../components/TypingEffect';
import { GoogleGenAI } from '@google/genai';


type InterviewPhase = 'intro' | 'conversational' | 'technical' | 'complete';

interface ConversationalQuestion {
  id: number;
  text: string;
  type: 'culture' | 'ethical' | 'conceptual' | 'motivation';
}

const CONVERSATIONAL_QUESTIONS: ConversationalQuestion[] = [
  { id: 1, text: "Welcome! Tell me about your background and what specifically interests you about this role, considering the job description we discussed.", type: "motivation" },
  { id: 2, text: "Describe a significant challenge you've faced in a previous role, how you approached it, and what the outcome was.", type: "conceptual" },
  { id: 3, text: "In a team environment, how do you handle situations where your ideas differ significantly from your colleagues' or manager's?", type: "culture" },
  { id: 4, text: "Based on your resume, could you tell me about a project where you heavily utilized a key skill mentioned in the job description, such as [mention a specific skill like 'React' or 'Python']?", type: "conceptual" },
  { id: 5, text: "Imagine you're developing a new feature, and you identify a potential ethical concern related to data privacy. How would you raise this issue and what steps would you propose?", type: "ethical" },
  { id: 6, text: "How do you prioritize your tasks when working on multiple projects with tight deadlines, and how do you ensure quality?", type: "culture" },
  { id: 7, text: "Tell me about a time you had to learn a new technology or framework quickly for a project. How did you approach the learning process and what was the result?", type: "conceptual" },
  { id: 8, text: "What are your long-term career aspirations, and how do you see this specific role aligning with them, particularly given its responsibilities?", type: "motivation" },
  { id: 9, text: "Describe a situation where you received critical feedback on your work. How did you respond, and what specific actions did you take based on that feedback?", type: "culture" },
  { id: 10, text: "Considering the responsibilities outlined in the job description, which one do you find most exciting and why, and how do your skills prepare you for it?", type: "motivation" },
];

interface CodingChallenge {
  id: number;
  title: string;
  description: string;
  example: string;
}

const CODING_CHALLENGES: CodingChallenge[] = [
  {
    id: 1,
    title: "Array Deduplication",
    description: "Given a sorted array `nums`, remove the duplicates in-place such that each element appears only once and returns the new length. Do not allocate extra space for another array; you must do this by modifying the input array in-place with O(1) extra memory.",
    example: "Input: nums = [1,1,2]\nOutput: 2, nums = [1,2,_]\nExplanation: Your function should return k = 2, with the first two elements of nums being 1 and 2 respectively. It does not matter what you leave beyond the returned k."
  },
  {
    id: 2,
    title: "Valid Parentheses",
    description: "Given a string `s` containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid. An input string is valid if: 1. Open brackets must be closed by the same type of brackets. 2. Open brackets must be closed in the correct order. 3. Every close bracket has a corresponding open bracket of the same type.",
    example: "Input: s = \"()[]{}\"\nOutput: true"
  },
  {
    id: 3,
    title: "Find Largest Number in Array",
    description: "Write a function to find the largest number in a given array of integers. You can assume the array will not be empty.",
    example: "Input: nums = [3, 5, 7, 2, 8, -1]\nOutput: 8"
  },
];


const SkillCheckInterviewPage: React.FC = () => {
  const navigate = useNavigate();
  const [jobDescription, setJobDescription] = useState<string>('');
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeContent, setResumeContent] = useState<string | null>(null);
  const [apiKeyPromptVisible, setApiKeyPromptVisible] = useState(false);
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [interviewPhase, setInterviewPhase] = useState<InterviewPhase>('intro');
  const [isMicActive, setIsMicActive] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [transcriptions, setTranscriptions] = useState<ChatMessage[]>([]); // For conversational
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]); // For technical

  const [currentConversationalQuestionIndex, setCurrentConversationalQuestionIndex] = useState(0);
  const [currentTechnicalChallengeIndex, setCurrentTechnicalChallengeIndex] = useState(0);
  const [technicalAnswerInput, setTechnicalAnswerInput] = useState<string>(''); // For technical phase textarea
  const [selectedLanguage, setSelectedLanguage] = useState<string>('JavaScript'); // New state for selected language

  const currentInputTranscription = useRef<string>('');
  const currentOutputTranscription = useRef<string>('');
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Refs for stable state values within callbacks
  const liveSessionRef = useRef<Awaited<ReturnType<typeof GoogleGenAI.prototype.live.connect>> | null>(null);
  const interviewPhaseRef = useRef<InterviewPhase>(interviewPhase);
  const currentConversationalQuestionIndexRef = useRef(currentConversationalQuestionIndex);

  useEffect(() => { interviewPhaseRef.current = interviewPhase; }, [interviewPhase]);
  useEffect(() => { currentConversationalQuestionIndexRef.current = currentConversationalQuestionIndex; }, [currentConversationalQuestionIndex]);


  const handleResumeFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setResumeFile(file);
      const reader = new FileReader();
      reader.onloadend = async () => {
        const fileData = reader.result;
        // In a real app, use a proper library for PDF/DOCX parsing
        if (file.type === 'application/pdf') {
          setResumeContent(`(PDF file uploaded: ${file.name}. Real content extraction would be here.)`);
        } else if (file.type.includes('wordprocessingml') || file.type.includes('msword')) {
          setResumeContent(`(Word document uploaded: ${file.name}. Real content extraction would be here.)`);
        } else if (file.type === 'text/plain') {
          setResumeContent(fileData as string);
        } else {
          setResumeContent(`(Unsupported file type uploaded: ${file.name}. Please upload PDF, DOCX, DOC, or TXT.)`);
        }
      };
      reader.readAsText(file); // Attempt to read as text for simpler files
    }
  };

  const speakText = async (text: string) => {
    setIsSpeaking(true);
    try {
      const audio = await generateSpeech(text);
      await playAudio(audio);
    } catch (error) {
      console.error("Error speaking text:", error);
    } finally {
      setIsSpeaking(false);
    }
  };

  const stopAllInterviewSessions = useCallback(async () => {
    await stopLiveSession();
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    setIsMicActive(false);
    setInterviewStarted(false);
    setInterviewPhase('intro');
    setTranscriptions([]);
    setChatMessages([]);
    currentInputTranscription.current = '';
    currentOutputTranscription.current = '';
    setCurrentConversationalQuestionIndex(0);
    setCurrentTechnicalChallengeIndex(0);
    setTechnicalAnswerInput('');
    setIsLoading(false);
    setIsSpeaking(false);
    liveSessionRef.current = null; // Clear the ref
  }, []);

  const createSystemInstruction = useCallback((currentJobDescription: string, currentResumeContent: string, codingLanguage: string) => `
    You are RetroCruit AI, a highly skilled technical interviewer. You will conduct a mock interview in two phases: conversational and technical.
        
    **Job Description:**
    \`\`\`
    ${currentJobDescription}
    \`\`\`
    
    **Candidate's Resume Content:**
    \`\`\`
    ${currentResumeContent}
    \`\`\`
    
    **Phase 1: Conversational Interview**
    For this phase, I will provide you with a structured series of 10 conversational questions. Your role is to:
    1.  **Listen and Evaluate:** Thoroughly listen to the candidate's audio response to the question I provide.
    2.  **Provide Feedback:** Offer concise, professional, and encouraging verbal feedback (audio output) on their answer, evaluating its relevance, clarity, and depth in relation to the job description and resume.
    3.  **Confirm Readiness:** Conclude your response by explicitly stating, "I'm ready for the next question." or "Proceed to the next question." This signals to me (the frontend) that you have finished your evaluation and are awaiting the next prompt.
    4.  **Do NOT Ask Questions:** Crucially, you must **NOT** ask new conversational questions yourself. You should only respond to the candidate's answers and confirm readiness for the next question.
    
    **Phase 2: Technical Interview**
    Once the conversational phase is complete, I will transition you to the technical interview phase and provide you with specific coding challenges or technical questions via text. Your role is to:
    1.  **Evaluate Solutions:** After I present a challenge and the candidate provides their solution (via text input), evaluate their code or answer for correctness, efficiency, and adherence to best practices, always considering the job description. The candidate will be providing solutions in **${codingLanguage}**.
    2.  **Provide Constructive Feedback:** Offer detailed, constructive textual feedback (text output, then converted to speech) and suggest improvements if necessary.
    3.  **Do NOT Generate Challenges:** You must **NOT** generate new coding challenges or technical questions yourself. I (the frontend) will provide the challenges.
    
    Maintain a professional, encouraging, and clear tone throughout the interview.
  `, [selectedLanguage]); // Add selectedLanguage to dependencies

  const startCombinedInterview = async () => {
    if (!jobDescription.trim() || !resumeContent || resumeContent.startsWith('(Unsupported')) {
      alert("Please provide a job description and upload a valid resume to start the interview.");
      return;
    }

    const hasKey = await ensureApiKeySelected();
    if (!hasKey) {
      setApiKeyPromptVisible(true);
      return;
    }
    setApiKeyPromptVisible(false);
    setIsLoading(true);
    setInterviewStarted(true);
    setInterviewPhase('conversational');
    setCurrentConversationalQuestionIndex(0); // Reset for new interview
    setCurrentTechnicalChallengeIndex(0);     // Reset for new interview
    setTechnicalAnswerInput(''); // Clear previous input
    setTranscriptions([]); // Clear old conversational history
    setChatMessages([]); // Clear old technical history

    const initialSystemInstruction = createSystemInstruction(jobDescription, resumeContent!, selectedLanguage);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const callbacks: LiveSessionCallbacks = {
        onopen: async () => {
          setIsMicActive(true);
          await startAudioInput(stream);
          setIsLoading(false);
          
          // Initial greeting will be the first conversational question
          const firstQuestion = CONVERSATIONAL_QUESTIONS[0].text;
          setTranscriptions((prev) => [...prev, { role: 'model', text: firstQuestion }]);
          // Send the first question to the live session as input for the AI to process.
          if (liveSessionRef.current) {
            liveSessionRef.current.sendRealtimeInput({ media: { data: btoa(firstQuestion), mimeType: 'text/plain' } });
          }
        },
        onmessage: async (message) => {
          // Handle audio output and transcription updates
          // Audio output is handled by geminiService.ts -> connectToLiveSession
          // Transcription is updated in refs, then state for UI below.

          if (message.serverContent?.outputTranscription) {
            currentOutputTranscription.current += message.serverContent.outputTranscription.text;
          } else if (message.serverContent?.inputTranscription) {
            currentInputTranscription.current += message.serverContent.inputTranscription.text;
          }

          if (message.serverContent?.turnComplete) {
            const userText = currentInputTranscription.current.trim();
            const modelText = currentOutputTranscription.current.trim();

            if (userText) {
              setTranscriptions((prev) => [...prev, { role: 'user', text: userText }]);
            }
            if (modelText) {
              setTranscriptions((prev) => [...prev, { role: 'model', text: modelText }]);
            }

            // Clear current turn transcriptions
            currentInputTranscription.current = '';
            currentOutputTranscription.current = '';

            // Conversational Phase Logic
            if (interviewPhaseRef.current === 'conversational') {
                const nextQuestionIndex = currentConversationalQuestionIndexRef.current + 1;
                setCurrentConversationalQuestionIndex(nextQuestionIndex); // Update state for re-render

                if (nextQuestionIndex < CONVERSATIONAL_QUESTIONS.length) {
                    const nextQuestion = CONVERSATIONAL_QUESTIONS[nextQuestionIndex].text;
                    setTranscriptions((prev) => [...prev, { role: 'model', text: nextQuestion }]);
                    if (liveSessionRef.current) { // Use the stored session to send next input
                       liveSessionRef.current.sendRealtimeInput({ media: { data: btoa(nextQuestion), mimeType: 'text/plain' } });
                    }
                } else {
                    // All conversational questions asked, transition to technical phase
                    setInterviewPhase('technical'); // Triggers useEffect for phase change
                    await speakText("Thank you. Let's now move to the technical interview phase.");
                    await stopLiveSession(); // Stop live session for text-based technical

                    const techSystemInstruction = createSystemInstruction(jobDescription, resumeContent!, selectedLanguage);
                    // Note: `startChatSession` implicitly initializes a new chat without live audio
                    // We pass both conversational (transcriptions) and technical (chatMessages) history
                    // as context for the next phase.
                    await startChatSession(techSystemInstruction, GEMINI_MODEL_TEXT_PRO, transcriptions.concat(chatMessages));
                    
                    // Present first technical challenge
                    const firstChallenge = CODING_CHALLENGES[0]; 
                    const challengePrompt = `Here is your first coding challenge:\n\n**${firstChallenge.title}**\n\n${firstChallenge.description}\n\nExample:\n\`\`\`\n${firstChallenge.example}\n\`\`\`\n\nPlease provide your solution in a code block.`;
                    
                    // Add challenge text to UI chatMessages
                    setChatMessages((prev) => [...prev, { role: 'model', text: challengePrompt }]);
                    await speakText(challengePrompt); // AI speaks out the challenge
                    setCurrentTechnicalChallengeIndex(0); // Ensure index is reset
                    setIsLoading(false); // Enable user input for technical phase
                }
            }
          }
        },
        onerror: (e) => {
          console.error("Live session error:", e);
          setIsMicActive(false);
          alert("Error during live session. Please try again.");
          stopAllInterviewSessions();
        },
        onclose: () => {
          console.log("Live session closed.");
          setIsMicActive(false);
          // If we intentionally stop, don't show alert
        },
      };

      // Initial connection for the live audio session
      const session = await connectToLiveSession(callbacks, [], initialSystemInstruction);
      liveSessionRef.current = session; // Store the active session

    } catch (error) {
      console.error("Error starting interview:", error);
      alert("Failed to start microphone or connect to AI. Please ensure microphone access is granted.");
      setInterviewStarted(false);
      setIsLoading(false);
    }
  };

  const handleSendTechnicalAnswer = async () => {
    if (!technicalAnswerInput.trim()) {
      alert("Please enter your answer before submitting.");
      return;
    }
    setIsLoading(true);
    // Add user's answer to chatMessages
    const userMessageText = `Here is my solution in ${selectedLanguage}:\n\`\`\`${selectedLanguage.toLowerCase()}\n${technicalAnswerInput}\n\`\`\n\nPlease evaluate it.`;
    setChatMessages((prev) => [...prev, { role: 'user', text: userMessageText }]);
    setTechnicalAnswerInput(''); // Clear input field

    try {
      const responseStream = await sendMessageToChat(userMessageText);
      let fullResponseText = '';
      for await (const chunk of responseStream) {
        fullResponseText += chunk.text;
        setChatMessages((prevMessages) => {
          const lastMessage = prevMessages[prevMessages.length - 1];
          if (lastMessage && lastMessage.role === 'model' && lastMessage.text.endsWith('|')) {
            const updatedMessages = [...prevMessages];
            updatedMessages[prevMessages.length - 1] = { ...lastMessage, text: lastMessage.text.slice(0, -1) + chunk.text + '|' };
            return updatedMessages;
          } else {
            return [...prevMessages, { role: 'model', text: chunk.text + '|' }];
          }
        });
      }
      setChatMessages((prevMessages) => {
        const lastMessage = prevMessages[prevMessages.length - 1];
        if (lastMessage && lastMessage.role === 'model') {
          return [...prevMessages.slice(0, -1), { ...lastMessage, text: lastMessage.text.slice(0, -1) }];
        }
        return prevMessages;
      });
      await speakText(fullResponseText);
    } catch (error) {
      console.error("Error sending technical answer:", error);
      setChatMessages((prev) => [...prev, { role: 'model', text: "I encountered an error while processing your answer. Please try again or check your API key." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNextTechnicalChallenge = async () => {
    const nextChallengeIndex = currentTechnicalChallengeIndex + 1;
    setCurrentTechnicalChallengeIndex(nextChallengeIndex);

    if (nextChallengeIndex < CODING_CHALLENGES.length) {
      setIsLoading(true);
      const nextChallenge = CODING_CHALLENGES[nextChallengeIndex];
      const challengePrompt = `Here is your next coding challenge:\n\n**${nextChallenge.title}**\n\n${nextChallenge.description}\n\nExample:\n\`\`\`\n${nextChallenge.example}\n\`\`\`\n\nPlease provide your solution in a code block.`;
      
      setChatMessages((prev) => [...prev, { role: 'model', text: challengePrompt }]); // Add challenge text to UI
      
      // Send the prompt to the AI to "read" and get ready for evaluation
      const responseStream = await sendMessageToChat(challengePrompt);
      let fullTechResponse = '';
      for await (const chunk of responseStream) {
        fullTechResponse += chunk.text;
      }
      // Although the AI's response might be a re-statement of the prompt or an acknowledgement,
      // we log it to chatMessages to show the AI's internal processing, then speak the prompt again.
      setChatMessages((prev) => [...prev, { role: 'model', text: fullTechResponse }]);
      await speakText(challengePrompt); // AI speaks out the challenge
      setIsLoading(false);
    } else {
      // All technical challenges completed
      setInterviewPhase('complete');
      const completionMessage = "This concludes our mock interview. Thank you for your time.";
      setChatMessages((prev) => [...prev, { role: 'model', text: completionMessage }]);
      await speakText(completionMessage);
      setIsLoading(false);
      // Optional: Add a delay before redirecting or stopping all sessions
      setTimeout(stopAllInterviewSessions, 5000);
    }
  };


  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [transcriptions, chatMessages]);

  useEffect(() => {
    // Cleanup on component unmount
    return () => {
      stopAllInterviewSessions();
    };
  }, [stopAllInterviewSessions]);


  return (
    <div className="relative min-h-screen w-screen flex flex-col items-center bg-gradient-to-br from-black to-purple-950 text-white font-['Michroma'] overflow-hidden p-8">
      <div className="absolute top-8 left-8 text-purple-400 text-lg cursor-pointer hover:text-purple-200 transition-colors duration-300 z-50" onClick={() => { stopAllInterviewSessions(); navigate('/'); }}>
        &lt; Back to Home
      </div>

      <h1 className="text-4xl text-purple-400 drop-shadow-[0_0_15px_rgba(255,0,255,0.5)] mt-16 mb-8">
        SKILL CHECK: Mock Interview
      </h1>

      {!interviewStarted ? (
        <div className="flex flex-col items-center mt-10 p-8 bg-purple-900/10 border border-purple-500/30 rounded-lg shadow-lg shadow-purple-500/10 backdrop-blur-md animate-fade-in max-w-4xl w-full">
          <p className="text-lg text-purple-100 mb-6 text-center leading-relaxed">
            Prepare for a comprehensive mock interview by providing a job description and your resume. RetroCruit AI will conduct a tailored conversational and technical interview.
          </p>

          <div className="w-full mb-6">
            <label htmlFor="job-description" className="block text-purple-300 text-sm font-bold mb-2">
              Job Description:
            </label>
            <textarea
              id="job-description"
              className="w-full p-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white font-mono placeholder-gray-400 focus:outline-none focus:border-purple-500 min-h-[150px] custom-scrollbar"
              placeholder="Paste the job description here..."
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
            ></textarea>
          </div>

          <div className="w-full mb-8">
            <label htmlFor="resume-upload" className="block text-purple-300 text-sm font-bold mb-2">
              Upload Resume (PDF, DOCX, TXT):
            </label>
            <input
              id="resume-upload"
              type="file"
              accept=".pdf,.doc,.docx,.txt"
              onChange={handleResumeFileChange}
              className="block w-full text-sm text-purple-100 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-700 cursor-pointer"
            />
            {resumeFile && (
              <p className="text-purple-200 text-sm mt-2">
                File Selected: <span className="font-bold">{resumeFile.name}</span>
                {resumeContent && resumeContent.startsWith('(Unsupported') && (
                  <span className="text-red-300 ml-2">{resumeContent}</span>
                )}
                {resumeContent && resumeContent.includes("file uploaded") && (
                  <span className="text-yellow-300 ml-2">{resumeContent}</span>
                )}
              </p>
            )}
          </div>

          <div className="w-full mb-6">
            <label htmlFor="coding-language-skillcheck" className="block text-purple-300 text-sm font-bold mb-2">
              Select Coding Language for Technical Interview:
            </label>
            <select
              id="coding-language-skillcheck"
              className="w-full p-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              aria-label="Select Coding Language for Technical Interview"
              disabled={isLoading || interviewStarted}
            >
              <option value="JavaScript">JavaScript</option>
              <option value="Python">Python</option>
              <option value="Java">Java</option>
              <option value="C++">C++</option>
              <option value="C#">C#</option>
            </select>
          </div>

          <HolographicButton
            onClick={startCombinedInterview}
            disabled={isLoading || !jobDescription.trim() || !resumeContent || resumeContent.startsWith('(Unsupported')}
            size="default" // Use default size
          >
            {isLoading ? 'Starting Interview...' : 'Start Mock Interview'}
          </HolographicButton>
        </div>
      ) : (
        <div className="flex flex-col w-full max-w-4xl mt-4">
          <div className="text-lg text-purple-200 mb-4 text-center">
            Interview Phase: <span className="font-bold uppercase text-purple-300">{interviewPhase}</span>
          </div>

          <div ref={chatContainerRef} className="w-full h-[60vh] md:h-[70vh] bg-purple-900/10 border border-purple-500/30 rounded-lg shadow-lg shadow-purple-500/10 backdrop-blur-md p-4 overflow-y-auto custom-scrollbar flex flex-col space-y-4">
            {interviewPhase === 'conversational' ? (
              <>
                {transcriptions.map((msg, index) => (
                  <div
                    key={`conv-${index}`}
                    className={`p-3 rounded-lg shadow-md max-w-[80%] ${
                      msg.role === 'user' ? 'bg-blue-700/50 self-end ml-auto' : 'bg-emerald-700/50 self-start mr-auto'
                    }`}
                  >
                    <span className={`${msg.role === 'user' ? 'text-blue-100' : 'text-emerald-100'}`}>
                      {msg.text}
                    </span>
                  </div>
                ))}
                {isMicActive && currentInputTranscription.current && (
                  <div className="p-3 rounded-lg shadow-md max-w-[80%] bg-blue-700/50 self-end ml-auto">
                    <span className="text-blue-100">
                      {currentInputTranscription.current}
                      <span className="inline-block w-1 h-4 bg-blue-100 animate-pulse ml-1"></span>
                    </span>
                  </div>
                )}
                {isMicActive && currentOutputTranscription.current && (
                  <div className="p-3 rounded-lg shadow-md max-w-[80%] bg-emerald-700/50 self-start mr-auto">
                    <span className="text-emerald-100">
                      {currentOutputTranscription.current}
                      <span className="inline-block w-1 h-4 bg-emerald-100 animate-pulse ml-1"></span>
                    </span>
                  </div>
                )}
              </>
            ) : (
              <>
                {chatMessages.map((msg, index) => (
                  <div
                    key={`tech-${index}`}
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
                {isSpeaking && (
                  <div className="p-3 rounded-lg shadow-md max-w-[80%] bg-emerald-700/50 self-start mr-auto">
                    <span className="text-emerald-100 animate-pulse">AI is speaking...</span>
                  </div>
                )}
              </>
            )}
            {interviewPhase === 'complete' && (
              <div className="p-3 rounded-lg shadow-md max-w-[80%] bg-purple-700/50 self-center mx-auto text-center">
                <span className="text-purple-100">
                  <TypingEffect text="Interview Complete! Thank you for your time." speed={50} blinkCursor={true} />
                </span>
              </div>
            )}
          </div>

          {(interviewPhase === 'conversational' || interviewPhase === 'technical') && (
            <div className="mt-4 flex flex-col md:flex-row gap-4 justify-between items-center">
              {interviewPhase === 'conversational' && (
                <p className="text-sm mt-2 text-gray-400 text-center w-full">
                  {isMicActive ? 'Microphone Active, AI Listening...' : 'Connecting to AI...'}
                </p>
              )}
              {interviewPhase === 'technical' && (
                <>
                  <textarea
                    className="flex-1 p-4 bg-gray-800/50 border border-gray-600 rounded-lg text-white font-mono placeholder-gray-400 focus:outline-none focus:border-purple-500 min-h-[100px] md:min-h-0 custom-scrollbar"
                    placeholder={`Type your technical answer in ${selectedLanguage} here...`}
                    value={technicalAnswerInput}
                    onChange={(e) => setTechnicalAnswerInput(e.target.value)}
                    rows={5}
                  ></textarea>
                  <div className="flex flex-col gap-4 flex-shrink-0">
                    <HolographicButton
                      onClick={handleSendTechnicalAnswer}
                      disabled={isLoading || isSpeaking || !technicalAnswerInput.trim()}
                      size="default" // Use default size
                    >
                      {isLoading ? 'Sending...' : 'Send Answer'}
                    </HolographicButton>
                    {currentTechnicalChallengeIndex < CODING_CHALLENGES.length - 1 && (
                      <HolographicButton
                        onClick={handleNextTechnicalChallenge}
                        disabled={isLoading || isSpeaking}
                        size="default" // Use default size
                      >
                        Next Challenge
                      </HolographicButton>
                    )}
                  </div>
                </>
              )}
              <HolographicButton
                onClick={stopAllInterviewSessions}
                className="mt-2 bg-red-600 hover:bg-red-700" // Apply red styling
                size="default" // Use default size
              >
                End Interview
              </HolographicButton>
            </div>
          )}
        </div>
      )}

      {/* API Key Prompt Modal */}
      {apiKeyPromptVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-[1000]">
          <div className="bg-gradient-to-br from-purple-900 to-indigo-900 p-8 rounded-lg shadow-2xl border border-purple-500/50 max-w-md text-center">
            <h3 className="text-xl font-bold mb-4 text-purple-300">API Key Required</h3>
            <p className="text-purple-100 mb-6">
              Please select your Gemini API key in the AI Studio environment to continue.
            </p>
            <p className="text-purple-200 text-sm mb-4">
              <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">
                Learn more about Gemini API billing.
              </a>
            </p>
            <button
              onClick={() => setApiKeyPromptVisible(false)}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors duration-300 text-base"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SkillCheckInterviewPage;