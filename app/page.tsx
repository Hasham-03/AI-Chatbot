// app/page.tsx (or app/page.js)
'use client';
import { useState } from 'react';

// You will need to install this library to render the
// bolding, lists, and code blocks from the AI.
// In your terminal, run: npm install react-markdown
import ReactMarkdown from 'react-markdown';

export default function Home() {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // -----------------------------------------------------------------
  // ⬇️ PASTE YOUR API GATEWAY URL HERE ⬇️
  // -----------------------------------------------------------------
  const API_URL = 'https://lxgpwjs6c6.execute-api.ap-south-1.amazonaws.com/v1/ask';
  // -----------------------------------------------------------------

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question) return;

    setIsLoading(true);
    setAnswer('');

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: question,
        }),
      });

      const data = await response.json();

      // ------------------
// THIS CODE IS CORRECT
// ------------------
if (response.ok) {
  // 'data' is ALREADY the parsed JSON object
  setAnswer(data.answer);
} else {
  // 'data' is ALREADY the parsed error object
  setAnswer(`Error: ${data.error || 'Something went wrong'}`);
}
    } catch (error) {
      console.error('Fetch error:', error);
      setAnswer(`Error: Could not connect to the API. Check the console.`);
    }

    setIsLoading(false);
  };

  return (
    <main style={styles.container}>
      <h1 style={styles.title}>🤖 Easy Solutions</h1>
      <p style={styles.subtitle}>
        Ask a complex question about anything, and get a simple answer.
      </p>

      <form onSubmit={handleSubmit} style={styles.form}>
        <textarea
          style={styles.textarea}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="e.g., Explain the difference between a Microprocessor and a Microcontroller"
        />
        <button type="submit" style={styles.button} disabled={isLoading}>
          {isLoading ? 'Thinking...' : 'Ask'}
        </button>
      </form>

      {/* This is the box where the AI's answer will appear */}
      {answer && (
        <div style={styles.answerBox}>
          <ReactMarkdown>{answer}</ReactMarkdown>
        </div>
      )}
    </main>
  );
}

// Basic styles to make it look decent
const styles: { [key: string]: React.CSSProperties } = {
  container: {
    maxWidth: '800px',
    margin: '40px auto',
    padding: '20px',
    fontFamily: 'system-ui, sans-serif',
    color: '#222',
  },
  title: {
    fontSize: '2.5rem',
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    fontSize: '1.1rem',
    color: '#555',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    margin: '30px 0',
  },
  textarea: {
    width: '100%',
    minHeight: '100px',
    padding: '10px',
    fontSize: '1rem',
    borderRadius: '8px',
    border: '1px solid #ccc',
    boxSizing: 'border-box', // Added this for better padding
  },
  button: {
    padding: '12px',
    fontSize: '1rem',
    backgroundColor: '#0070f3',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  answerBox: {
    padding: '20px',
    backgroundColor: '#f4f4f4',
    borderRadius: '8px',
    border: '1px solid #eee',
    lineHeight: '1.6',
    whiteSpace: 'pre-wrap', // Helps render newlines
  },
};