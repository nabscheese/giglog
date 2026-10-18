"use client";
import { useState } from 'react';

export default function AIPage() {
  const [input, setInput] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleChat() {
    if (!input) return;
    
    setLoading(true);
    setResponse('');

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: input }),
      });

      const data = await res.json();
      
      if (data.content) {
        setResponse(data.content);
      } else {
        setResponse("Error: The AI didn't respond correctly.");
      }
    } catch (error) {
      setResponse("Error: Could not connect to the server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '100vh', 
      fontFamily: 'sans-serif', 
      padding: '20px',
      backgroundColor: '#121212', // Dark theme to match professional apps
      color: 'white'
    }}>
      <div style={{ 
        backgroundColor: '#1e1e1e', 
        padding: '30px', 
        borderRadius: '15px', 
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        maxWidth: '600px',
        width: '100%',
        border: '1px solid #333'
      }}>
        <h1 style={{ textAlign: 'center', marginBottom: '20px', fontSize: '24px' }}>GigLog AI Assistant</h1>
        
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <input 
            value={input} 
            onChange={(e) => setInput(e.target.value)} 
            placeholder="Ask me about your gigs..." 
            style={{ 
              flex: 1, 
              padding: '12px', 
              borderRadius: '8px', 
              border: '1px solid #444',
              backgroundColor: '#2a2a2a',
              color: 'white',
              fontSize: '16px'
            }}
          />
          <button 
            onClick={handleChat} 
            disabled={loading}
            style={{ 
              padding: '12px 20px', 
              borderRadius: '8px', 
              border: 'none', 
              backgroundColor: '#0070f3', 
              color: 'white', 
              fontWeight: 'bold', 
              cursor: 'pointer',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? '...' : 'Send'}
          </button>
        </div>

        {response && (
          <div style={{ 
            padding: '15px', 
            backgroundColor: '#2a2a2a', 
            borderRadius: '8px', 
            borderLeft: '4px solid #0070f3',
            whiteSpace: 'pre-wrap',
            lineHeight: '1.5',
            fontSize: '15px'
          }}>
            <strong style={{ color: '#0070f3' }}>AI:</strong> {response}
          </div>
        )}
      </div>
    </div>
  );
}
