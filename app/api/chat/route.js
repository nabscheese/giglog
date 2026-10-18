import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    // 1. Get the prompt from the frontend
    const { prompt } = await req.json();

    // 2. Send the request to Ollama Cloud
    const response = await fetch('https://ollama.com/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OLLAMA_API_KEY}`, // Uses the key you added to Vercel
      },
      body: JSON.stringify({
        model: 'gemma4:cloud', 
        messages: [{ role: 'user', content: prompt }],
        stream: false, 
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API responded with ${response.status}`);
    }

    const data = await response.json();

    // 3. Send the AI's answer back to your website
    return NextResponse.json({ 
      content: data.message.content 
    });

  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: "Failed to connect to AI" }, { status: 500 });
  }
}
