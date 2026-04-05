import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import HolographicButton from '../components/HolographicButton';
import { ensureApiKeySelected } from '../services/geminiService';

const SkillBuilderPage: React.FC = () => { // Renamed component
  const navigate = useNavigate();
  const [headerMoved, setHeaderMoved] = useState(false);
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);
  const [apiKeyPromptVisible, setApiKeyPromptVisible] = useState(false);

  useEffect(() => {
    // Simulate header animation after component mounts
    const headerTimer = setTimeout(() => setHeaderMoved(true), 300);
    const sidebarTimer = setTimeout(() => setIsSidebarVisible(true), 1000); // Delay sidebar appearance
    return () => {
      clearTimeout(headerTimer);
      clearTimeout(sidebarTimer);
    };
  }, []);

  const handleSidebarItemClick = async (path: string) => {
    const hasKey = await ensureApiKeySelected();
    if (!hasKey) {
      setApiKeyPromptVisible(true);
      return;
    }
    setApiKeyPromptVisible(false);
    navigate(path);
  };

  const closeApiKeyPrompt = () => {
    setApiKeyPromptVisible(false);
  };

  return (
    <div className="relative min-h-screen w-screen bg-gradient-to-br from-black to-blue-950 text-white font-['Michroma'] overflow-hidden p-8">
      {/* Header */}
      <div className={`fixed z-50 transition-all duration-1000 ease-out
                       ${headerMoved ? 'top-10 left-16 md:left-24 transform-none text-left' : 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center'}`}>
        <h1 className={`text-4xl md:text-5xl text-white drop-shadow-[0_0_15px_rgba(0,255,200,0.5)] transition-all duration-1000 ease-in-out
                       ${headerMoved ? 'text-4xl md:text-5xl' : 'text-5xl md:text-6xl'}`}>
          SKILL BUILDER {/* Updated title */}
        </h1>
        <span className={`block text-xl md:text-2xl text-emerald-400 opacity-80 mt-2 tracking-wide transition-all duration-1000 ease-in-out
                         ${headerMoved ? 'opacity-100 text-lg md:text-xl' : 'opacity-0'}`}>
          RetroCruit AI
        </span>
      </div>

      {/* Holographic Sidebar */}
      <div className={`fixed top-0 right-0 w-64 md:w-72 lg:w-80 h-full bg-gradient-to-l from-emerald-900/10 to-transparent
                       border-l-2 border-emerald-500/50 shadow-lg shadow-emerald-500/20 backdrop-blur-md z-40
                       flex flex-col justify-center items-center transition-transform duration-1000 ease-out
                       ${isSidebarVisible ? 'translate-x-0' : 'translate-x-full'}`}>
        <ul className="list-none p-0 m-0 w-4/5 text-left">
          <li className="my-8 md:my-10 transition-all duration-300 ease-in-out">
            <HolographicButton onClick={() => handleSidebarItemClick('/conversational-interview')} active={false} size="xs">
              Conversational Interview
            </HolographicButton>
          </li>
          <li className="my-8 md:my-10 transition-all duration-300 ease-in-out delay-100">
            <HolographicButton onClick={() => handleSidebarItemClick('/technical-interview')} active={false} size="xs">
              Technical Interview
            </HolographicButton>
          </li>
          <li className="my-8 md:my-10 transition-all duration-300 ease-in-out delay-200">
            <HolographicButton onClick={() => handleSidebarItemClick('/resume-analyzer')} active={false} size="xs"> {/* Updated text and path */}
              Resume Analyzer
            </HolographicButton>
          </li>
          <li className="my-8 md:my-10 transition-all duration-300 ease-in-out delay-300">
            <HolographicButton onClick={() => navigate('/')} active={false} size="xs"> {/* Changed to navigate to Home */}
              Return Home
            </HolographicButton>
          </li>
        </ul>
      </div>

      {/* Main Content Area */}
      <div className={`relative z-30 mt-40 md:mt-48 max-w-4xl px-4 text-left transition-all duration-1000 ease-out
                       ${isSidebarVisible
                           ? 'ml-16 mr-[256px] md:mr-[288px] lg:mr-[320px]' // Shift content left, create margin for sidebar
                           : 'ml-auto mr-auto w-full' // Centered when sidebar is hidden
                       }`}>
        <p className="text-lg md:text-xl text-emerald-200 leading-relaxed mb-6 animate-fade-in delay-500">
          Welcome to your personalized skill-building hub. Select a module from the holographic interface on the right to practice specific interview skills.
        </p>
        <p className="text-lg md:text-xl text-emerald-200 leading-relaxed mb-6 animate-fade-in delay-700">
          Each module is designed to enhance different facets of your professional acumen, leveraging the advanced capabilities of Gemini AI. Prepare to engage in dynamic conversations, tackle coding challenges, or get feedback on your resume.
        </p>
        <p className="text-lg md:text-xl text-emerald-200 leading-relaxed animate-fade-in delay-900">
          Your journey to interview mastery begins now.
        </p>
      </div>

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
              onClick={closeApiKeyPrompt}
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

export default SkillBuilderPage;