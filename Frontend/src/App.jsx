import React, { useState, useRef, useEffect } from 'react';
import { Mic, Send, Volume2, VolumeX, ChefHat, Clock, Users, RefreshCw } from 'lucide-react';
import './App.css';

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [recognitionActive, setRecognitionActive] = useState(false);
  
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  // Initialize Speech Recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsRecording(false);
        setRecognitionActive(false);
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
        setRecognitionActive(false);
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
        setRecognitionActive(false);
      };
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Text-to-Speech
  const speak = (text) => {
    if (!audioEnabled || !window.speechSynthesis) return;
    
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1;
    utterance.volume = 1;
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  // Voice Recording
  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in your browser. Please use Chrome or Edge.');
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
      setRecognitionActive(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsRecording(true);
        setRecognitionActive(true);
      } catch (error) {
        console.error('Error starting recognition:', error);
        alert('Could not start voice recognition. Please try again.');
      }
    }
  };

  // Send message to backend
  const handleSend = async (text = input) => {
    if (!text.trim()) return;

    const userMessage = { role: 'user', content: text };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: text }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const aiMessage = { role: 'assistant', content: data.reply };
      setMessages(prev => [...prev, aiMessage]);
      
      if (audioEnabled) {
        speak(data.reply);
      }
    } catch (error) {
      console.error('Error:', error);
      const errorMessage = { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error. Please make sure the backend server is running on port 3001.' 
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    stopSpeaking();
  };

  return (
    <div className="app-container">
      <div className="chat-container">
        {/* Header */}
        <div className="header">
          <div className="header-left">
            <div className="app-icon">
              <ChefHat className="icon" />
            </div>
            <div>
              <h1 className="app-title">Cookie Assistant</h1>
              <p className="app-subtitle">Your AI Cooking Helper</p>
            </div>
          </div>
          
          <div className="header-actions">
            <button
              onClick={clearChat}
              className="icon-button"
              title="Clear chat"
            >
              <RefreshCw className="icon" />
            </button>
            <button
              onClick={() => {
                setAudioEnabled(!audioEnabled);
                if (!audioEnabled) stopSpeaking();
              }}
              className="icon-button"
              title={audioEnabled ? "Disable audio" : "Enable audio"}
            >
              {audioEnabled ? (
                <Volume2 className="icon" />
              ) : (
                <VolumeX className="icon" />
              )}
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="messages-container">
          {messages.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">
                <ChefHat className="icon-large" />
              </div>
              <h2 className="empty-title">Welcome to Cookie Assistant!</h2>
              <p className="empty-text">
                Ask me anything about cooking, recipes, ingredients, or cooking techniques.
                You can type or use voice input!
              </p>
              <div className="feature-tags">
                <span className="tag"><Clock /> Step-by-step guides</span>
                <span className="tag"><Users /> Serving adjustments</span>
                <span className="tag"><ChefHat /> Recipe suggestions</span>
              </div>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`message ${msg.role}`}
            >
              <div className="message-bubble">
                <p className="message-text">{msg.content}</p>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="message assistant">
              <div className="message-bubble">
                <div className="typing-indicator">
                  <span className="dot"></span>
                  <span className="dot"></span>
                  <span className="dot"></span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="input-container">
          <div className="input-wrapper">
            <button
              onClick={toggleRecording}
              className={`voice-button ${isRecording ? 'recording' : ''}`}
              title={isRecording ? "Stop recording" : "Start recording"}
            >
              <Mic className="icon" />
            </button>

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder={isRecording ? "Listening..." : "Ask about recipes, ingredients..."}
              className="message-input"
              disabled={isRecording}
            />

            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
              className="send-button"
              title="Send message"
            >
              <Send className="icon" />
            </button>
          </div>

          {isSpeaking && (
            <div className="speaking-indicator">
              <div className="sound-wave">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="bar" style={{ animationDelay: `${i * 100}ms` }} />
                ))}
              </div>
              <span className="speaking-text">Speaking...</span>
              <button onClick={stopSpeaking} className="stop-speaking">
                Stop
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;