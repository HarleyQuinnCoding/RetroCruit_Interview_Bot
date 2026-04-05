import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import HolographicButton from '../components/HolographicButton'; // Import HolographicButton
import { analyzeResume, ensureApiKeySelected } from '../services/geminiService'; // Updated function name
import { GEMINI_MODEL_TEXT_PRO } from '../constants'; // Using text model for resume analysis

const ResumeAnalyzer: React.FC = () => { // Renamed component
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [resumeBinary, setResumeBinary] = useState<{ data: string, mimeType: string } | null>(null);
  const [resumeContent, setResumeContent] = useState<string | null>(null); // To store extracted text
  const [jobDescription, setJobDescription] = useState<string>(''); // New state for job description
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [apiKeyPromptVisible, setApiKeyPromptVisible] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setAnalysisResult(null); // Clear previous analysis
      setResumeContent(null); // Clear previous resume content
      setResumeBinary(null);

      const reader = new FileReader();
      reader.onloadend = async () => {
        const result = reader.result as string;
        if (file.type === 'text/plain') {
          setResumeContent(result);
          setResumeBinary(null);
        } else {
          const base64Data = result.split(',')[1];
          setResumeBinary({ data: base64Data, mimeType: file.type });
          setResumeContent(`[Binary file: ${file.name}]`);
        }
      };
      
      if (file.type === 'text/plain') {
        reader.readAsText(file);
      } else {
        reader.readAsDataURL(file);
      }
    }
  };

  const handleAnalyzeResume = async () => {
    if (!selectedFile || !resumeContent || resumeContent.startsWith('(Unsupported')) {
      alert("Please upload a resume first and ensure content can be extracted.");
      return;
    }

    const hasKey = await ensureApiKeySelected();
    if (!hasKey) {
      setApiKeyPromptVisible(true);
      return;
    }
    setApiKeyPromptVisible(false);

    setIsLoading(true);
    setAnalysisResult(null);

    try {
      let fullPrompt = `Analyze the following resume content. Provide feedback on formatting, keywords, achievements, and clarity.`;

      if (jobDescription.trim()) {
        fullPrompt += `
          Additionally, compare the resume against the provided Job Description to determine the candidate's fit, highlight missing qualifications/skills, and suggest areas for improvement to better align with the job requirements.

          Job Description:
          \`\`\`
          ${jobDescription}
          \`\`\`
          `;
      } else {
        fullPrompt += ` (No job description provided, providing general resume feedback.)`;
      }

      fullPrompt += ` Format your response professionally with clear headings.`;

      const contentToAnalyze = resumeBinary || resumeContent;
      const response = await analyzeResume(contentToAnalyze, fullPrompt); 
      setAnalysisResult(response.text);
    } catch (error) {
      console.error("Error during resume analysis:", error);
      alert("Failed to analyze resume. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadReport = () => {
    if (analysisResult) {
      // Remove '#' and '*' from the report for plain text download
      const cleanedText = analysisResult.replace(/[#*]/g, '');
      const blob = new Blob([cleanedText], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'resume_analysis_report.txt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="relative min-h-screen w-screen flex flex-col items-center bg-gradient-to-br from-black to-blue-950 text-white font-['Michroma'] overflow-hidden p-8">
      <div className="absolute top-8 left-8 text-emerald-400 text-lg cursor-pointer hover:text-emerald-200 transition-colors duration-300 z-50" onClick={() => navigate('/skill-builder')}> {/* Updated navigation */}
        &lt; Back to Skill Builder
      </div>

      <h1 className="text-4xl text-emerald-400 drop-shadow-[0_0_15px_rgba(0,255,200,0.5)] mt-16 mb-8">
        Resume Analyzer {/* Updated title */}
      </h1>

      <div className="flex flex-col items-center w-full max-w-3xl p-8 bg-blue-900/10 border border-blue-500/30 rounded-lg shadow-lg shadow-blue-500/10 backdrop-blur-md animate-fade-in">
        <p className="text-lg text-blue-100 mb-6 text-center leading-relaxed">
          Upload your resume (PDF, DOCX, TXT) and optionally a job description, then let Gemini AI provide detailed professional feedback and job fit analysis.
        </p>

        <div className="w-full mb-6">
          <label htmlFor="job-description" className="block text-blue-300 text-sm font-bold mb-2">
            Job Description (Optional for general feedback, Recommended for job fit analysis):
          </label>
          <textarea
            id="job-description"
            className="w-full p-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white font-mono placeholder-gray-400 focus:outline-none focus:border-blue-500 min-h-[150px] custom-scrollbar"
            placeholder="Paste the job description here..."
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            aria-label="Job Description"
          ></textarea>
        </div>

        <div className="w-full mb-6">
          <label htmlFor="file-upload" className="block text-blue-300 text-sm font-bold mb-2">
            Upload Resume:
          </label>
          <input
            id="file-upload"
            type="file"
            accept=".pdf,.doc,.docx,.txt" // Updated accepted file types
            onChange={handleFileChange}
            className="block w-full text-sm text-blue-100 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
            aria-label="Upload Resume"
          />
        </div>

        {selectedFile && (
          <div className="mb-6 border border-blue-500/30 rounded-md p-4 max-w-full text-left bg-blue-800/20">
            <h3 className="text-blue-200 text-md font-bold">File Selected:</h3>
            <p className="text-blue-100 break-all">{selectedFile.name}</p>
            {resumeContent && resumeContent.startsWith('(Unsupported') && (
              <p className="text-red-300 text-sm mt-2">{resumeContent}</p>
            )}
             {resumeContent && !resumeContent.startsWith('(Unsupported') && resumeContent.includes("file uploaded") && (
              <p className="text-yellow-300 text-sm mt-2">{resumeContent}</p>
            )}
          </div>
        )}

        <HolographicButton
          onClick={handleAnalyzeResume}
          disabled={isLoading || !resumeContent} // Removed !jobDescription.trim() from here
          size="default" // Use default size for primary action button
          aria-label="Analyze Resume"
        >
          {isLoading ? 'Analyzing...' : 'Analyze Resume'}
        </HolographicButton>

        {analysisResult && (
          <div className="mt-8 p-6 bg-green-900/10 border border-green-500/30 rounded-lg shadow-lg shadow-green-500/10 text-left w-full custom-scrollbar max-h-96 overflow-y-auto" role="region" aria-live="polite">
            <h3 className="text-xl text-green-300 mb-4">AI Analysis:</h3>
            <p className="text-green-100 whitespace-pre-wrap">{analysisResult.replace(/[#*]/g, '')}</p>
          </div>
        )}

        {analysisResult && (
          <div className="mt-4">
            <HolographicButton
              onClick={handleDownloadReport}
              disabled={isLoading}
              size="default"
            >
              Download Report
            </HolographicButton>
          </div>
        )}
      </div>

      {/* API Key Prompt Modal */}
      {apiKeyPromptVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-[1000]" role="dialog" aria-modal="true" aria-labelledby="api-key-required-title">
          <div className="bg-gradient-to-br from-blue-900 to-indigo-900 p-8 rounded-lg shadow-2xl border border-blue-500/50 max-w-md text-center">
            <h3 id="api-key-required-title" className="text-xl font-bold mb-4 text-blue-300">API Key Required</h3>
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
              aria-label="Close API Key Prompt"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResumeAnalyzer;