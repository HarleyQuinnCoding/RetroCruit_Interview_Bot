import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import About from './pages/About';
import SkillBuilderPage from './pages/SkillBuilderPage'; // Renamed from SkillCheckPage
import ConversationalInterview from './pages/ConversationalInterview';
import TechnicalInterview from './pages/TechnicalInterview';
import ResumeAnalyzer from './pages/ResumeAnalyzer'; // Renamed from ImageAnalysis
import SkillCheckInterviewPage from './pages/SkillCheckInterviewPage'; // New component

const App: React.FC = () => {
  return (
    <Router>
      <div className="App min-h-screen text-white font-['Michroma'] bg-black">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/skill-builder" element={<SkillBuilderPage />} /> {/* Now Skill Builder */}
          <Route path="/skill-check" element={<SkillCheckInterviewPage />} /> {/* New Skill Check */}
          <Route path="/conversational-interview" element={<ConversationalInterview />} />
          <Route path="/technical-interview" element={<TechnicalInterview />} />
          <Route path="/resume-analyzer" element={<ResumeAnalyzer />} /> {/* Now Resume Analyzer */}
        </Routes>
      </div>
    </Router>
  );
};

export default App;