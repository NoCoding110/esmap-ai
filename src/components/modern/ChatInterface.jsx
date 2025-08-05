/**
 * Modern Chat Interface Component
 * AI-powered chat interface for ESMAP energy queries
 * 
 * Features:
 * - Clean, conversational design
 * - Real-time typing indicators
 * - Message history
 * - Smart suggestions
 * - File upload support
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Paperclip,
  Mic,
  MoreHorizontal,
  User,
  Bot,
  Sparkles,
  FileText,
  BarChart3,
  Globe,
  Zap,
  Clock
} from 'lucide-react';

const ChatInterface = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      content: "Hello! I'm your ESMAP AI assistant. I can help you analyze energy data, understand country profiles, and provide insights on renewable energy trends. What would you like to explore today?",
      timestamp: new Date(Date.now() - 60000)
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [suggestions] = useState([
    "Show me renewable energy trends for Nigeria",
    "What's the energy access rate in Bangladesh?",
    "Compare solar capacity across Sub-Saharan Africa",
    "Latest climate finance updates"
  ]);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (content = inputValue) => {
    if (!content.trim()) return;

    const userMessage = {
      id: messages.length + 1,
      type: 'user',
      content: content.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const botResponse = {
        id: messages.length + 2,
        type: 'bot',
        content: generateResponse(content),
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, botResponse]);
      setIsTyping(false);
    }, 1500);
  };

  const generateResponse = (query) => {
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('nigeria') || lowerQuery.includes('renewable')) {
      return "Based on the latest ESMAP data, Nigeria has shown significant growth in renewable energy capacity, with solar installations increasing by 45% in 2024. The country's renewable energy share has reached 23% of total generation capacity. Would you like me to show you specific metrics or compare with neighboring countries?";
    }
    
    if (lowerQuery.includes('bangladesh') || lowerQuery.includes('access')) {
      return "Bangladesh has made remarkable progress in energy access, achieving 96% electrification as of 2024. Rural areas have seen the most dramatic improvement, with off-grid solar solutions playing a crucial role. The country is now focusing on grid stability and renewable integration.";
    }
    
    if (lowerQuery.includes('solar') || lowerQuery.includes('africa')) {
      return "Sub-Saharan Africa's solar capacity has tripled since 2020, with South Africa, Kenya, and Ghana leading installations. The region now has over 12 GW of solar capacity. Mini-grid solutions are particularly effective in rural areas. I can provide detailed breakdowns by country if you'd like.";
    }
    
    if (lowerQuery.includes('climate') || lowerQuery.includes('finance')) {
      return "Climate finance for energy projects reached $23.5 billion in 2024, with 65% allocated to renewable energy infrastructure. ESMAP has facilitated $2.1 billion in clean energy investments across 34 countries. Key focus areas include grid modernization and energy storage solutions.";
    }
    
    return "That's an interesting question about energy systems. Based on ESMAP's comprehensive database covering 193 countries, I can provide detailed insights on energy access, renewable capacity, policy frameworks, and investment flows. Could you be more specific about what aspect you'd like to explore?";
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (timestamp) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="container max-w-4xl py-8">
      <div className="card h-[600px] flex flex-col">
        {/* Header */}
        <div className="card-header border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="heading-4 mb-0">ESMAP AI Assistant</h3>
                <p className="text-small text-muted">Ask me anything about global energy data</p>
              </div>
            </div>
            <button className="btn-ghost p-2">
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.type === 'bot' && (
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <Bot className="w-4 h-4 text-white" />
                </div>
              )}
              
              <div className={`max-w-[70%] ${message.type === 'user' ? 'order-first' : ''}`}>
                <div
                  className={`p-4 rounded-2xl ${
                    message.type === 'user'
                      ? 'bg-blue-600 text-white ml-auto'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <p className="text-sm leading-relaxed">{message.content}</p>
                </div>
                <div className={`flex items-center gap-1 mt-1 text-xs text-gray-800 ${
                  message.type === 'user' ? 'justify-end' : 'justify-start'
                }`}>
                  <Clock className="w-3 h-3" />
                  <span>{formatTime(message.timestamp)}</span>
                </div>
              </div>

              {message.type === 'user' && (
                <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <User className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
          ))}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-gray-100 p-4 rounded-2xl">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Suggestions */}
        {messages.length === 1 && (
          <div className="px-6 pb-4">
            <p className="text-sm text-gray-800 mb-3">Try asking:</p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSendMessage(suggestion)}
                  className="text-xs px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="card-footer border-t">
          <div className="flex items-end gap-3">
            <button className="btn-ghost p-2 mb-2">
              <Paperclip className="w-5 h-5" />
            </button>
            
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about energy data, country profiles, or renewable trends..."
                className="input resize-none pr-12"
                rows={1}
                style={{
                  minHeight: '44px',
                  maxHeight: '120px',
                  height: 'auto',
                  overflowY: inputValue.length > 100 ? 'scroll' : 'hidden'
                }}
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={!inputValue.trim() || isTyping}
                className={`absolute right-2 bottom-2 p-2 rounded-md transition-colors ${
                  inputValue.trim() && !isTyping
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-gray-200 text-gray-800 cursor-not-allowed'
                }`}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            
            <button className="btn-ghost p-2 mb-2">
              <Mic className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <button className="card card-body text-center hover:shadow-md transition-all group">
          <FileText className="w-6 h-6 text-blue-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
          <div className="text-sm font-medium text-gray-900">Latest Reports</div>
          <div className="text-xs text-gray-800 mt-1">Browse energy reports</div>
        </button>
        
        <button className="card card-body text-center hover:shadow-md transition-all group">
          <BarChart3 className="w-6 h-6 text-green-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
          <div className="text-sm font-medium text-gray-900">Data Analysis</div>
          <div className="text-xs text-gray-800 mt-1">Analyze energy trends</div>
        </button>
        
        <button className="card card-body text-center hover:shadow-md transition-all group">
          <Globe className="w-6 h-6 text-purple-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
          <div className="text-sm font-medium text-gray-900">Country Profiles</div>
          <div className="text-xs text-gray-800 mt-1">Explore by country</div>
        </button>
        
        <button className="card card-body text-center hover:shadow-md transition-all group">
          <Zap className="w-6 h-6 text-yellow-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
          <div className="text-sm font-medium text-gray-900">Live Data</div>
          <div className="text-xs text-gray-800 mt-1">Real-time metrics</div>
        </button>
      </div>
    </div>
  );
};

export default ChatInterface;