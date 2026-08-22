import React, { useState, useEffect, useRef } from "react";
import { 
  ShieldAlert, 
  Zap, 
  Globe, 
  WifiOff, 
  FileText, 
  Search, 
  Upload, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Database,
  Trash2,
  Mic,
  MicOff,
  Copy,
  Check,
  Stethoscope,
  BookOpen,
  Activity,
  ArrowRight,
  ShieldCheck,
  Volume2,
  VolumeX,
  Download,
  BarChart3,
  Sparkles,
  Info,
  X,
  Layers,
  Server,
  Cpu,
  Brain,
  Github
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

export default function App() {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [error, setError] = useState("");
  const [serverHealth, setServerHealth] = useState({ online: false, docsCount: 0, chunksCount: 0 });
  const [documents, setDocuments] = useState([]);
  const [activeTab, setActiveTab] = useState("answer"); // answer | vector | sources
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Audio Speech Synthesis state
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  // Speech Recognition state
  const [showAbout, setShowAbout] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const recognitionRef = useRef(null);

  const quickScenarios = [
    { 
      title: "Paracetamol Dosage Conflict", 
      desc: "Compare adult dosage recommendations across handbooks", 
      type: "Conflict Intercept", 
      query: "What is the standard Paracetamol dosage for adults?" 
    },
    { 
      title: "IV Dehydration Protocol", 
      desc: "Emergency fluid resuscitation volume guidelines", 
      type: "Conflict Intercept", 
      query: "How much IV fluid should be administered for severe dehydration?" 
    },
    { 
      title: "Nutritional Policy", 
      desc: "Daily recommended limits on added sugar intake", 
      type: "Policy Verification", 
      query: "What is the recommended limit for added sugar intake?" 
    },
    { 
      title: "Emergency Care Metric", 
      desc: "Target response time for maternal care transport", 
      type: "SOP Metric", 
      query: "What is the required ambulance response time for emergency maternal care?" 
    }
  ];

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onresult = (event) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setQuestion(transcript);
      };

      recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    } else {
      setSpeechSupported(false);
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in this browser. Please use Chrome or Edge.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Text-to-Speech Read Aloud
  const toggleSpeech = () => {
    if (!("speechSynthesis" in window)) {
      alert("Text-to-Speech is not supported in your browser.");
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else if (response && response.answer) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(response.answer);
      utterance.rate = 0.95;
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
    }
  };

  const checkHealth = async () => {
    try {
      const res = await fetch(API_BASE + "/");
      if (res.ok) {
        const data = await res.json();
        setServerHealth({
          online: true,
          docsCount: data.documents_count,
          chunksCount: data.total_chunks
        });
      } else {
        setServerHealth({ online: false, docsCount: 0, chunksCount: 0 });
      }
    } catch {
      setServerHealth({ online: false, docsCount: 0, chunksCount: 0 });
    }
  };

  const fetchDocuments = async () => {
    try {
      const res = await fetch(API_BASE + "/documents");
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    checkHealth();
    fetchDocuments();
    const interval = setInterval(checkHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (qText) => {
    const query = qText || question;
    if (!query.trim()) return;

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }

    setLoading(true);
    setError("");
    setResponse(null);
    setActiveTab("answer");

    try {
      const res = await fetch(API_BASE + "/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: query })
      });

      if (!res.ok) {
        throw new Error("Server returned " + res.status);
      }

      const data = await res.json();
      setResponse(data);
    } catch (err) {
      setError(err.message || "Failed to connect to backend server");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (response && response.answer) {
      navigator.clipboard.writeText(response.answer);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleExportJSON = () => {
    if (!response) return;
    const blob = new Blob([JSON.stringify(response, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sangamrag_clinical_audit.json";
    a.click();
  };

  const handleClearCache = async () => {
    try {
      await fetch(API_BASE + "/cache", { method: "DELETE" });
      alert("Cache cleared successfully!");
    } catch (e) {
      alert("Failed to clear cache");
    }
  };

  const handleFileUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append("files", files[i]);
    }

    setUploading(true);
    try {
      const res = await fetch(API_BASE + "/upload", {
        method: "POST",
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        alert(data.message);
        checkHealth();
        fetchDocuments();
      } else {
        alert("Upload failed");
      }
    } catch (err) {
      alert("Error uploading file");
    } finally {
      setUploading(false);
    }
  };

  // Calculate Vector Confidence Score from L2 Distance
  const calculateConfidence = () => {
    if (!response || !response.sources || response.sources.length === 0) return 0;
    const topDistance = response.sources[0].distance || 1.0;
    // Normalize L2 distance to confidence percentage (lower distance = higher confidence)
    const score = Math.max(10, Math.min(99, Math.round((1.5 - topDistance) * 65 + 30)));
    return score;
  };

  const confidenceScore = calculateConfidence();

  return (
    <div className="min-h-screen bg-[#111317] text-zinc-100 font-sans selection:bg-emerald-500 selection:text-zinc-950">
      
      {/* Formal Header */}
      <header className="border-b border-zinc-800/80 bg-[#14171d]/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          
          {/* Logo & Identity */}
          <div className="flex items-center space-x-3.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-600/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-sm">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-base font-bold text-zinc-100 tracking-tight">SangamRAG</h1>
                <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  v2.0 Advanced Clinical AI
                </span>
              </div>
              <p className="text-xs text-zinc-400">FAISS Vector Intelligence & Conflict Guardrail Engine</p>
            </div>
          </div>

          {/* Right System Diagnostics */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 bg-zinc-900 border border-zinc-800 px-3.5 py-1.5 rounded-md text-xs">
              <span className={"w-2 h-2 rounded-full " + (serverHealth.online ? "bg-emerald-400" : "bg-rose-500")} />
              <span className="text-zinc-300 font-medium">
                {serverHealth.online ? serverHealth.chunksCount + " Active Policy Chunks" : "System Offline"}
              </span>
            </div>

            <button 
              onClick={handleClearCache}
              title="Purge Response Cache" 
              className="p-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-md border border-zinc-800 transition-colors duration-150"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <button
              onClick={() => setShowAbout(true)}
              title="About SangamRAG"
              className="flex items-center space-x-1.5 px-3 py-2 bg-zinc-900 hover:bg-emerald-600/10 text-zinc-400 hover:text-emerald-400 rounded-md border border-zinc-800 hover:border-emerald-500/40 transition-all duration-150 text-xs font-medium"
            >
              <Info className="w-4 h-4" />
              <span>About</span>
            </button>
          </div>

        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-5xl mx-auto px-6 pt-8 pb-20">
        
        {/* Workspace Title & Live Diagnostic Gauge */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
              <span>Ground-Truth Verification Engine</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-zinc-100">
              Clinical Decision Workspace
            </h2>
            <p className="text-xs text-zinc-400 max-w-xl">
              Query cross-referenced national health guidelines with automatic conflict detection, voice input, and vector telemetry.
            </p>
          </div>

          {/* Engine Status Card */}
          <div className="bg-[#161920] border border-zinc-800 p-3.5 rounded-xl flex items-center space-x-4 shrink-0 shadow-sm">
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-zinc-500">Vector Model</span>
              <p className="text-xs font-semibold text-zinc-200">all-MiniLM-L6-v2</p>
            </div>
            <div className="w-px h-8 bg-zinc-800" />
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-zinc-500">Primary Provider</span>
              <p className="text-xs font-semibold text-emerald-400">Groq compound-mini</p>
            </div>
          </div>
        </div>

        {/* Input Bar & Controls */}
        <div className="mb-8 space-y-4">
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} 
            className="space-y-3"
          >
            <div className="relative flex items-center shadow-md rounded-xl">
              <Search className="w-4 h-4 absolute left-4 text-zinc-400" />
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder={isListening ? "Listening... Speak your query clearly" : "Enter a medical query or click the mic to speak..."}
                className={"w-full bg-[#161920] border text-zinc-100 placeholder-zinc-500 pl-11 pr-40 py-3.5 rounded-xl text-xs font-medium transition-all duration-200 focus:outline-none " + (isListening ? "border-rose-500/80 ring-2 ring-rose-500/20 bg-rose-950/20" : "border-zinc-800 focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30")}
              />

              {/* Action Buttons */}
              <div className="absolute right-2 flex items-center space-x-2">
                {speechSupported && (
                  <button
                    type="button"
                    onClick={toggleListening}
                    title={isListening ? "Stop Voice Input" : "Activate Voice Input"}
                    className={"p-2 rounded-lg transition-all duration-200 flex items-center justify-center " + (isListening ? "bg-rose-600 text-white shadow-sm" : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700")}
                  >
                    {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5 text-emerald-400" />}
                  </button>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-semibold text-xs rounded-lg transition-all duration-150 shadow-sm disabled:opacity-50 flex items-center space-x-1.5"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Searching...</span>
                    </>
                  ) : (
                    <>
                      <span>Query</span>
                      <ArrowRight className="w-3 h-3" />
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Listening Indicator Bar */}
            {isListening && (
              <div className="text-xs text-rose-400 flex items-center justify-between bg-rose-950/30 border border-rose-500/30 px-3.5 py-2 rounded-lg transition-all">
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                  <span className="font-semibold text-xs">Microphone Active</span>
                  <span className="text-zinc-400 text-xs">— Transcribing voice query into input field...</span>
                </div>
                <button type="button" onClick={toggleListening} className="underline text-xs hover:text-rose-300">Cancel</button>
              </div>
            )}
          </form>

          {/* Quick Scenario Chips */}
          <div className="mt-5 space-y-2">
            <p className="text-[11px] font-semibold text-zinc-400 flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Preset Demonstration Scenarios</span>
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {quickScenarios.map((sc, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setQuestion(sc.query);
                    handleSubmit(sc.query);
                  }}
                  className="p-3 rounded-lg bg-[#161920] border border-zinc-800 hover:border-emerald-500/40 hover:bg-[#1a1e27] transition-all duration-200 text-left space-y-1 transform hover:-translate-y-0.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-200">{sc.title}</span>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                      {sc.type}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400">{sc.desc}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="mb-8 p-4 bg-rose-950/30 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center space-x-3 transition-all">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <div>
              <p className="font-semibold">Query Request Error</p>
              <p className="text-zinc-400">{error}</p>
            </div>
          </div>
        )}

        {/* Advanced Tabbed Output Panel */}
        {response && (
          <div className="space-y-6 transition-all duration-300">
            
            {/* Top Multi-Tab Navigation Bar */}
            <div className="flex flex-wrap items-center justify-between border-b border-zinc-800/80 pb-3 gap-2">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setActiveTab("answer")}
                  className={"px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 " + (activeTab === "answer" ? "bg-emerald-600 text-zinc-950 shadow-sm" : "bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800")}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Verified Answer</span>
                </button>

                <button
                  onClick={() => setActiveTab("vector")}
                  className={"px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 " + (activeTab === "vector" ? "bg-emerald-600 text-zinc-950 shadow-sm" : "bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800")}
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>Vector Telemetry ({confidenceScore}% Match)</span>
                </button>

                <button
                  onClick={() => setActiveTab("sources")}
                  className={"px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 " + (activeTab === "sources" ? "bg-emerald-600 text-zinc-950 shadow-sm" : "bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800")}
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>Citations ({response.sources ? response.sources.length : 0})</span>
                </button>
              </div>

              {/* Export Audit Report Button */}
              <button
                onClick={handleExportJSON}
                className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-medium rounded-lg transition-colors flex items-center space-x-1"
                title="Export JSON Audit Report"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>Export Audit</span>
              </button>
            </div>

            {/* TAB 1: ANSWER VIEW */}
            {activeTab === "answer" && (
              <div className="bg-[#161920] border border-zinc-800 rounded-xl p-6 shadow-md space-y-5">
                
                {/* Header Metadata & Controls */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 pb-3.5">
                  <div className="flex items-center space-x-2">
                    {/* Status Badge */}
                    {response.cached || response.mode === "cache" ? (
                      <span className="inline-flex items-center px-2.5 py-1 rounded text-[11px] font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20">
                        <Zap className="w-3 h-3 mr-1 text-amber-400" /> Cache Hit (24h TTL)
                      </span>
                    ) : response.mode === "conflict" ? (
                      <span className="inline-flex items-center px-2.5 py-1 rounded text-[11px] font-medium bg-rose-500/10 text-rose-300 border border-rose-500/20">
                        <ShieldAlert className="w-3 h-3 mr-1 text-rose-400" /> Quantitative Conflict Detected
                      </span>
                    ) : response.mode === "online" ? (
                      <span className="inline-flex items-center px-2.5 py-1 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                        <Globe className="w-3 h-3 mr-1 text-emerald-400" /> Groq Model Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-1 rounded text-[11px] font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                        <WifiOff className="w-3 h-3 mr-1 text-indigo-400" /> Local Ollama Active
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    {/* Text to Speech Read Aloud Button */}
                    <button 
                      onClick={toggleSpeech}
                      className={"p-1.5 rounded text-xs transition-colors flex items-center space-x-1.5 " + (isSpeaking ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200")}
                      title="Read Answer Aloud"
                    >
                      {isSpeaking ? <VolumeX className="w-3.5 h-3.5 text-emerald-400 animate-pulse" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
                      <span className="text-[11px] font-medium">{isSpeaking ? "Stop" : "Read Aloud"}</span>
                    </button>

                    {/* Copy Button */}
                    <button 
                      onClick={handleCopy}
                      className="p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors"
                      title="Copy Answer Text"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* CONFLICT BANNER */}
                {response.mode === "conflict" && (
                  <div className="bg-rose-950/20 border border-rose-500/30 rounded-lg p-4 space-y-3">
                    <div className="flex items-center space-x-2 text-rose-400 font-semibold text-xs">
                      <ShieldAlert className="w-4 h-4 shrink-0" />
                      <span>Conflict Intercept: Inconsistent Quantitative Claims</span>
                    </div>
                    <p className="text-xs text-zinc-300 leading-relaxed">
                      SangamRAG identified conflicting numerical values between official documents. AI synthesis was suspended to prevent clinical misguidance:
                    </p>
                    {response.conflicts && response.conflicts.length > 0 && (
                      <div className="space-y-2 pt-1">
                        {response.conflicts.map((c, i) => (
                          <div key={i} className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-[#111317] p-3 rounded border border-rose-500/20">
                            <div>
                              <span className="text-[10px] font-semibold text-zinc-500 uppercase block">Source File A</span>
                              <p className="text-rose-300 font-medium mt-0.5">
                                {c.source_a} ({c.year_a}): <span className="font-bold underline">{c.claim_a}</span>
                              </p>
                            </div>
                            <div>
                              <span className="text-[10px] font-semibold text-zinc-500 uppercase block">Source File B</span>
                              <p className="text-amber-300 font-medium mt-0.5">
                                {c.source_b} ({c.year_b}): <span className="font-bold underline">{c.claim_b}</span>
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Answer Content */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Response</span>
                  <div className="text-xs text-zinc-200 leading-relaxed bg-[#111317] p-4 rounded-lg border border-zinc-800/80 whitespace-pre-wrap font-sans">
                    {response.answer}
                  </div>
                </div>

              </div>
            )}

            {/* TAB 2: VECTOR TELEMETRY VIEW */}
            {activeTab === "vector" && (
              <div className="bg-[#161920] border border-zinc-800 rounded-xl p-6 shadow-md space-y-6">
                <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                  <div className="flex items-center space-x-2">
                    <BarChart3 className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-xs font-semibold text-zinc-200">Vector Search Analytics</h3>
                  </div>
                  <span className="text-xs font-mono text-zinc-400 bg-zinc-900 px-2.5 py-1 rounded border border-zinc-800">
                    Hash: {response.hash ? response.hash.substring(0, 16) : "N/A"}...
                  </span>
                </div>

                {/* Match Confidence Score Meter */}
                <div className="bg-[#111317] p-4 rounded-lg border border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-zinc-300">Semantic Relevance Confidence</span>
                    <span className="text-emerald-400 font-bold">{confidenceScore}% Match</span>
                  </div>
                  <div className="w-full bg-zinc-800 rounded-full h-2.5 overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-emerald-500 to-teal-400 h-2.5 rounded-full transition-all duration-500" 
                      style={{ width: confidenceScore + "%" }} 
                    />
                  </div>
                  <p className="text-[11px] text-zinc-500 leading-relaxed">
                    Confidence metric is computed dynamically from the top FAISS L2 vector distance ({response.sources && response.sources[0] ? response.sources[0].distance.toFixed(4) : "N/A"}).
                  </p>
                </div>

                {/* Vector Distance Distribution */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-zinc-400">Top 5 Vector L2 Distances</h4>
                  <div className="space-y-2">
                    {response.sources && response.sources.map((src, i) => (
                      <div key={i} className="flex items-center justify-between text-xs bg-[#111317] p-2.5 rounded border border-zinc-800">
                        <span className="font-medium text-zinc-300">{src.source} {src.year ? "(" + src.year + ")" : ""}</span>
                        <div className="flex items-center space-x-3">
                          <span className="text-zinc-500 font-mono text-[11px]">Distance: {src.distance.toFixed(4)}</span>
                          <div className="w-20 bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                            <div 
                              className="bg-emerald-500 h-1.5 rounded-full" 
                              style={{ width: Math.max(10, 100 - src.distance * 50) + "%" }} 
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}

            {/* TAB 3: SOURCES CITATIONS VIEW */}
            {activeTab === "sources" && (
              <div className="bg-[#161920] border border-zinc-800 rounded-xl p-6 shadow-md space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                  <div className="flex items-center space-x-2">
                    <Database className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-xs font-semibold text-zinc-200">Verbatim Document Chunks ({response.sources ? response.sources.length : 0})</h3>
                  </div>
                  <span className="text-[11px] text-zinc-500">Recursive Text Splitter (500-char window)</span>
                </div>

                <div className="space-y-3">
                  {response.sources && response.sources.map((src, i) => (
                    <div key={i} className="bg-[#111317] p-4 rounded-lg border border-zinc-800 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-emerald-400 flex items-center space-x-1.5">
                          <FileText className="w-3.5 h-3.5" />
                          <span>{src.source} {src.year ? "(" + src.year + ")" : ""}</span>
                        </span>
                        <span className="text-[10px] font-mono text-zinc-500">Distance: {src.distance.toFixed(4)}</span>
                      </div>
                      <p className="text-xs text-zinc-300 leading-relaxed font-mono bg-[#161920] p-3 rounded border border-zinc-800">
                        {src.text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

        {/* Footer Document Corpus Management */}
        <div className="mt-12 pt-6 border-t border-zinc-800/60">
          <div className="bg-[#161920] border border-zinc-800 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-zinc-200 flex items-center space-x-2">
                  <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Document Corpus Management</span>
                </h3>
                <p className="text-[11px] text-zinc-400 mt-0.5">Upload .txt files to trigger recursive text splitting & FAISS re-indexing.</p>
              </div>

              <label className={"px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-zinc-950 text-xs font-semibold rounded cursor-pointer transition-all shadow-sm flex items-center space-x-1.5 " + (uploading ? "opacity-50 cursor-not-allowed" : "")}>
                <Upload className="w-3.5 h-3.5" />
                <span>{uploading ? "Indexing..." : "Upload Document"}</span>
                <input 
                  type="file" 
                  accept=".txt" 
                  multiple 
                  onChange={handleFileUpload} 
                  disabled={uploading}
                  className="hidden" 
                />
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              {documents.map((doc, idx) => (
                <div key={idx} className="bg-[#111317] p-2.5 rounded border border-zinc-800 flex items-center justify-between text-xs">
                  <span className="font-medium text-zinc-300 truncate">{doc.name}</span>
                  <span className="text-[10px] text-zinc-500 font-mono">{(doc.size_bytes / 1024).toFixed(1)} KB</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </main>

      {/* ─── About Modal ─── */}
      {showAbout && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm px-4"
          onClick={() => setShowAbout(false)}
        >
          <div
            className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[#14171d] border border-zinc-800 rounded-2xl shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 flex items-center justify-between px-6 py-4 bg-[#14171d] border-b border-zinc-800 z-10">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-600/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-zinc-100">SangamRAG</h2>
                  <p className="text-xs text-zinc-400">v2.0 · Clinical AI Ground-Truth Engine</p>
                </div>
              </div>
              <button
                onClick={() => setShowAbout(false)}
                className="p-2 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-6 space-y-6">

              {/* What is SangamRAG */}
              <div>
                <p className="text-sm text-zinc-300 leading-relaxed">
                  <span className="text-emerald-400 font-semibold">SangamRAG</span> is a Retrieval-Augmented Generation (RAG) system built for healthcare field workers — ASHA workers, ANMs, and NHM staff. It answers clinical questions strictly from verified government health documents, automatically blocks answers when sources conflict, and provides vector-level transparency on every response.
                </p>
              </div>

              {/* Key Capabilities */}
              <div>
                <div className="flex items-center space-x-2 mb-3">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-semibold text-zinc-100">Key Capabilities</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { icon: <ShieldAlert className="w-4 h-4" />, label: "Conflict Interception", desc: "Blocks contradictory dosage / volume claims between documents" },
                    { icon: <Database className="w-4 h-4" />, label: "FAISS Vector Search", desc: "Semantic nearest-neighbour retrieval over policy chunks" },
                    { icon: <Mic className="w-4 h-4" />, label: "Voice-to-Text Input", desc: "Web Speech API mic for hands-free field queries" },
                    { icon: <Volume2 className="w-4 h-4" />, label: "Text-to-Speech Readout", desc: "Audio playback of verified answers" },
                    { icon: <BarChart3 className="w-4 h-4" />, label: "Vector Telemetry", desc: "Live semantic match confidence & L2 distance meter" },
                    { icon: <Download className="w-4 h-4" />, label: "Audit Export", desc: "One-click JSON report download for compliance" },
                  ].map(({ icon, label, desc }) => (
                    <div key={label} className="flex items-start space-x-2.5 bg-zinc-900 border border-zinc-800 rounded-xl p-3">
                      <span className="text-emerald-400 mt-0.5 shrink-0">{icon}</span>
                      <div>
                        <p className="text-xs font-semibold text-zinc-100">{label}</p>
                        <p className="text-xs text-zinc-500 mt-0.5">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tech Stack */}
              <div>
                <div className="flex items-center space-x-2 mb-3">
                  <Layers className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-semibold text-zinc-100">Full Tech Stack</h3>
                </div>
                <div className="space-y-3">
                  {/* Frontend */}
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                    <div className="flex items-center space-x-2 mb-3">
                      <Globe className="w-4 h-4 text-sky-400" />
                      <span className="text-xs font-semibold text-sky-400 uppercase tracking-wider">Frontend</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {["React 18", "Vite 5", "Tailwind CSS", "Lucide Icons", "Web Speech API", "SpeechSynthesis API"].map(t => (
                        <span key={t} className="text-xs bg-sky-500/10 border border-sky-500/20 text-sky-300 px-2.5 py-1 rounded-md">{t}</span>
                      ))}
                    </div>
                  </div>
                  {/* Backend */}
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                    <div className="flex items-center space-x-2 mb-3">
                      <Server className="w-4 h-4 text-violet-400" />
                      <span className="text-xs font-semibold text-violet-400 uppercase tracking-wider">Backend</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {["FastAPI", "Python 3.11", "Uvicorn", "CORS Middleware", "SHA256 TTL Cache", "REST API"].map(t => (
                        <span key={t} className="text-xs bg-violet-500/10 border border-violet-500/20 text-violet-300 px-2.5 py-1 rounded-md">{t}</span>
                      ))}
                    </div>
                  </div>
                  {/* AI / ML */}
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                    <div className="flex items-center space-x-2 mb-3">
                      <Brain className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">AI / ML Engine</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {["Groq LLM (compound-mini)", "SentenceTransformer (all-MiniLM-L6-v2)", "FAISS Vector Index", "LangChain RecursiveCharacterTextSplitter", "Ollama Offline Fallback", "384-dim Embeddings"].map(t => (
                        <span key={t} className="text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-md">{t}</span>
                      ))}
                    </div>
                  </div>
                  {/* Infrastructure */}
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                    <div className="flex items-center space-x-2 mb-3">
                      <Cpu className="w-4 h-4 text-amber-400" />
                      <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Infrastructure & DevOps</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {["Render.com (Cloud Deploy)", "GitHub (CI/CD)", "Python-dotenv (.env secrets)", "FAISS Index Persistence", "pickle + JSON cache store"].map(t => (
                        <span key={t} className="text-xs bg-amber-500/10 border border-amber-500/20 text-amber-300 px-2.5 py-1 rounded-md">{t}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Safety Architecture */}
              <div>
                <div className="flex items-center space-x-2 mb-3">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-semibold text-zinc-100">Safety Architecture</h3>
                </div>
                <div className="bg-rose-500/5 border border-rose-500/20 rounded-xl p-4 space-y-2">
                  <p className="text-xs text-zinc-300">The <span className="text-rose-400 font-semibold">Quantitative Conflict Detector</span> scans all retrieved document chunks for numeric claims (dosages in mg, volumes in ml, time in hours) and compares them across sources. If conflicting values are found, the AI is <span className="text-rose-400 font-semibold">blocked from answering</span> and both claims are shown side-by-side so the user can consult the original documents.</p>
                  <p className="text-xs text-zinc-500">This is designed to prevent dangerous AI hallucinations in healthcare field settings where wrong dosage information could cause patient harm.</p>
                </div>
              </div>

              {/* GitHub Link */}
              <div className="flex items-center justify-between border-t border-zinc-800 pt-4">
                <p className="text-xs text-zinc-500">Built for healthcare hackathon · 2026</p>
                <a
                  href="https://github.com/sandhruv/sanagam-rag"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-2 text-xs text-zinc-400 hover:text-emerald-400 transition-colors"
                >
                  <Github className="w-4 h-4" />
                  <span>sandhruv/sanagam-rag</span>
                </a>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
