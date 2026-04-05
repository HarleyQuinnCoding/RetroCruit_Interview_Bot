import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import TypingEffect from '../components/TypingEffect';
import HolographicButton from '../components/HolographicButton';
import CanvasDots from '../components/CanvasDots'; // Import the new component

// Removed Starfield and GlitchEffectCanvas components from here

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [typing1Complete, setTyping1Complete] = useState(false);
  const [secondMessageTypingActive, setSecondMessageTypingActive] = useState(false);
  const [secondMessageComplete, setSecondMessageComplete] = useState(false);
  const [hologramButtonsVisible, setHologramButtonsVisible] = useState(false);
  const [headerMoved, setHeaderMoved] = useState(false);
  const [scrollArrowVisible, setScrollArrowVisible] = useState(false);
  const [dividerVisible, setDividerVisible] = useState(false);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [aboutSectionVisible, setAboutSectionVisible] = useState(false);

  const handleTyping1Complete = useCallback(() => {
    setTyping1Complete(true);
    setSecondMessageTypingActive(true);
  }, []);

  const handleSecondMessageComplete = useCallback(() => {
    setSecondMessageComplete(true);
    setScrollArrowVisible(true);
  }, []);

  const handleScroll = useCallback(() => {
    const scrollPosition = window.scrollY;
    const windowHeight = window.innerHeight;

    const headerMoveThreshold = windowHeight * 0.1; // Header moves early
    const aboutSectionActivationThreshold = windowHeight * 0.5; // When About section starts to appear (mid-way through first screen)
    const buttonsSectionActivationThreshold = windowHeight * 1.5; // When Buttons section starts to appear (mid-way through second screen)

    // Header, overlay, typing effects (initial screen related)
    if (scrollPosition > headerMoveThreshold) {
      setOverlayVisible(true);
      setHeaderMoved(true);
      setSecondMessageTypingActive(false); // Stop second typing when header moves
      setScrollArrowVisible(false); // Hide scroll arrow
    } else {
      setOverlayVisible(false);
      setHeaderMoved(false);
      if (secondMessageComplete) { // Only show arrow if second message finished
        setScrollArrowVisible(true);
      }
      if (typing1Complete && !headerMoved) { // Only type second message if first is done and header hasn't moved
        setSecondMessageTypingActive(true);
      }
    }

    // About section visibility (should become visible when scrolling past approx 50% of first screen)
    if (scrollPosition >= aboutSectionActivationThreshold) {
      setAboutSectionVisible(true);
    } else {
      setAboutSectionVisible(false);
    }

    // Holographic Buttons and Divider visibility (should become visible when scrolling past approx 50% of second screen)
    if (scrollPosition >= buttonsSectionActivationThreshold) {
      setHologramButtonsVisible(true);
      setDividerVisible(true);
    } else {
      setHologramButtonsVisible(false);
      setDividerVisible(false);
    }
  }, [secondMessageComplete, typing1Complete, headerMoved]);


  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  const handleHologramClick = (path: string) => {
    navigate(path);
  };

  return (
    <div className="relative h-[300vh] text-center font-['Michroma'] overflow-x-hidden"> {/* Changed min-h-screen to h-[300vh] for explicit scroll height */}
      <CanvasDots /> {/* Replaced Starfield and GlitchEffectCanvas */}

      {/* Black Overlay */}
      <div className={`fixed inset-0 bg-black z-20 transition-opacity duration-500 pointer-events-none ${overlayVisible ? 'opacity-50' : 'opacity-0'}`}></div>

      {/* Initial Intro Section (fixed to viewport during initial view) */}
      <div className="fixed inset-0 flex flex-col items-center justify-center z-50 pointer-events-none">
        {/* Initial Typing Container */}
        <div className={`absolute left-1/2 -translate-x-1/2 top-1/4 whitespace-nowrap overflow-hidden
                       ${headerMoved ? 'top-4 left-8 text-sm !transform-none !w-auto !border-none' : 'w-[55ch] md:w-[65ch] text-lg md:text-xl border-r-2 border-red-700'}`}>
          <TypingEffect
            text="Initializing RetroCruit AI..."
            speed={70}
            className={`inline-block text-red-700 transition-all duration-800 ease-in-out ${headerMoved ? 'text-white text-sm' : ''}`}
            cursorClassName="text-red-700 h-[1.2em] md:h-[1.5em] align-text-bottom"
            onTypingComplete={handleTyping1Complete}
          />
        </div>

        {/* Scroll Arrow */}
        <div className={`absolute top-[60%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-red-700 text-xl md:text-2xl
                       ${scrollArrowVisible ? 'opacity-70 animate-float' : 'opacity-0'} transition-opacity duration-1000 ease-in-out`}>
          SCROLL
          <span className="block text-4xl mt-2">↓</span>
        </div>

        {/* Second Typing Container */}
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-sm md:text-base text-red-700 w-4/5 max-w-2xl text-center whitespace-pre-wrap break-words
                       ${secondMessageTypingActive ? 'opacity-100' : 'opacity-0'} transition-opacity duration-1000 ease-in-out`}>
          {secondMessageTypingActive && (
            <TypingEffect
              text="Welcome, Candidate. RetroCruit is an advanced AI designed to refine your interview skills. Select your mode."
              speed={40}
              className="inline-block text-red-700"
              cursorClassName="text-red-700 h-[2.5em] md:h-[1.2em] align-text-bottom"
              blinkCursor={true}
              onTypingComplete={handleSecondMessageComplete}
            />
          )}
        </div>
      </div>

      {/* Main Scrollable Content Area */}
      <div className="relative z-30">
        {/* Spacer to push content down past the fixed intro section */}
        <div className="h-[100vh]"></div>

        {/* About RetroCruit Content Section (new full screen segment) */}
        <div className={`flex items-center justify-center w-full min-h-screen p-8 md:p-12
                         transition-opacity duration-1000 ease-in-out
                         ${aboutSectionVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
          <div className="max-w-3xl bg-emerald-900/10 border border-emerald-500/20 rounded-xl shadow-lg shadow-emerald-500/10 backdrop-blur-md">
            <h1 className="text-4xl text-emerald-400 text-shadow-[0_0_10px_rgba(0,255,150,0.5)] mb-6">
              About <span className="text-white">RetroCruit</span> AI
            </h1>
            <p className="text-xl leading-relaxed mb-4 text-emerald-100">
              RetroCruit AI is your personal, <span className="text-emerald-300 font-bold">cutting-edge AI interviewer</span>, designed to elevate your readiness for any professional challenge.
            </p>
            <p className="text-lg leading-relaxed mb-8 text-emerald-100">
              Leveraging the power of <span className="text-emerald-300 font-bold">Google Gemini API</span>, RetroCruit offers a suite of mock interview experiences tailored to enhance your conversational, technical, and analytical skills.
            </p>

            <h2 className="text-2xl text-emerald-300 mb-6 mt-8">
              Our Mission
            </h2>
            <p className="text-lg leading-relaxed mb-8 text-emerald-100">
              To provide an immersive and adaptive interview simulation, offering instant feedback and diverse question formats to build your confidence and refine your responses.
            </p>

            <h2 className="text-2xl text-emerald-300 mb-6 mt-8">
              Technology Stack
            </h2>
            <ul className="flex justify-center gap-x-10 my-8">
              {/* React */}
              <li className="relative w-16 h-16 transform -rotate-12 skew-x-6 hover:scale-110 transition-transform duration-300">
                {[...Array(5)].map((_, i) => (
                  <span key={`react-span-${i}`} className="absolute inset-0 bg-blue-600/70 flex justify-center items-center rounded-md transition-all duration-500 group-hover:translate-x-8 group-hover:-translate-y-8"
                        style={{ zIndex: 5 - i, opacity: 0.2 + i * 0.2, transform: `translate(${i * 8}px, ${-i * 8}px)` }}>
                  </span>
                ))}
                <img src="https://upload.wikimedia.org/wikipedia/commons/a/a7/React-icon.svg" alt="React" className="relative z-10 w-10 h-10 object-contain" />
              </li>
              {/* TypeScript */}
              <li className="relative w-16 h-16 transform -rotate-12 skew-x-6 hover:scale-110 transition-transform duration-300">
                {[...Array(5)].map((_, i) => (
                  <span key={`ts-span-${i}`} className="absolute inset-0 bg-blue-800/70 flex justify-center items-center rounded-md transition-all duration-500 group-hover:translate-x-8 group-hover:-translate-y-8"
                        style={{ zIndex: 5 - i, opacity: 0.2 + i * 0.2, transform: `translate(${i * 8}px, ${-i * 8}px)` }}>
                  </span>
                ))}
                <img src="https://upload.wikimedia.org/wikipedia/commons/4/4c/Typescript_logo_2020.svg" alt="TypeScript" className="relative z-10 w-10 h-10 object-contain" />
              </li>
              {/* Tailwind CSS */}
              <li className="relative w-16 h-16 transform -rotate-12 skew-x-6 hover:scale-110 transition-transform duration-300">
                {[...Array(5)].map((_, i) => (
                  <span key={`tailwind-span-${i}`} className="absolute inset-0 bg-cyan-700/70 flex justify-center items-center rounded-md transition-all duration-500 group-hover:translate-x-8 group-hover:-translate-y-8"
                        style={{ zIndex: 5 - i, opacity: 0.2 + i * 0.2, transform: `translate(${i * 8}px, ${-i * 8}px)` }}>
                  </span>
                ))}
                <img src="https://upload.wikimedia.org/wikipedia/commons/d/d5/Tailwind_CSS_Logo.svg" alt="Tailwind CSS" className="relative z-10 w-10 h-10 object-contain" />
              </li>
            </ul>

            <p className="text-sm mt-8 text-emerald-500">
              &copy; 2024 RetroCruit AI. All rights reserved.
            </p>
          </div>
        </div>


        {/* Holographic Buttons (Skill Builder and Skill Check) and Divider (new full screen segment) */}
        <div className={`relative flex flex-col items-center justify-center w-full min-h-screen
                         transition-opacity duration-1000 ease-in-out z-40
                         ${hologramButtonsVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
            {/* Full-height Vertical Divider */}
            <div className={`absolute inset-y-0 left-1/2 -translate-x-1/2 w-0.5 bg-white transition-opacity duration-1000 ease-in-out
                             ${dividerVisible ? 'opacity-30' : 'opacity-0'} z-10`}></div>

            {/* Buttons positioned around the divider */}
            <div className="flex justify-evenly items-center w-full relative z-20">
                <HolographicButton onClick={() => handleHologramClick('/skill-builder')}>
                    Skill Builder
                </HolographicButton>
                <HolographicButton onClick={() => handleHologramClick('/skill-check')}>
                    Skill Check
                </HolographicButton>
            </div>
        </div>

      </div>
    </div>
  );
};

export default Home;