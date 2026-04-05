
import React from 'react';
import { useNavigate } from 'react-router-dom';

const About: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen w-screen flex flex-col justify-center items-center p-8 bg-gradient-to-br from-black to-blue-950 text-emerald-100 font-['Michroma'] overflow-hidden">
      <div className="absolute top-8 left-8 text-emerald-400 text-lg cursor-pointer hover:text-emerald-200 transition-colors duration-300 z-50" onClick={() => navigate('/')}>
        &lt; Back to Home
      </div>
      <div className="max-w-3xl p-8 md:p-12 bg-emerald-900/10 border border-emerald-500/20 rounded-xl shadow-lg shadow-emerald-500/10 backdrop-blur-md animate-fade-in">
        <h1 className="text-4xl text-emerald-400 text-shadow-emerald-lg mb-6 animate-fade-in-up">
          About <span className="text-white">RetroCruit</span> AI
        </h1>
        <p className="text-xl leading-relaxed mb-4 animate-fade-in-up delay-100">
          RetroCruit AI is your personal, <span className="text-emerald-300 font-bold">cutting-edge AI interviewer</span>, designed to elevate your readiness for any professional challenge.
        </p>
        <p className="text-lg leading-relaxed mb-8 animate-fade-in-up delay-200">
          Leveraging the power of <span className="text-emerald-300 font-bold">Google Gemini API</span>, RetroCruit offers a suite of mock interview experiences tailored to enhance your conversational, technical, and analytical skills.
        </p>

        <h2 className="text-2xl text-emerald-300 mb-6 mt-8 animate-fade-in-up delay-300">
          Our Mission
        </h2>
        <p className="text-lg leading-relaxed mb-8 animate-fade-in-up delay-400">
          To provide an immersive and adaptive interview simulation, offering instant feedback and diverse question formats to build your confidence and refine your responses.
        </p>

        <h2 className="text-2xl text-emerald-300 mb-6 mt-8 animate-fade-in-up delay-500">
          Technology Stack
        </h2>
        <ul className="flex justify-center gap-x-10 my-8 animate-fade-in-up delay-600">
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

        <p className="text-sm mt-8 text-emerald-500 animate-fade-in-up delay-700">
          &copy; 2024 RetroCruit AI. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default About;
