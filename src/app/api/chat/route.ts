import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();
    const response = await fetch('https://ollama.com/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OLLAMA_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gemma4:cloud', 
        messages: [{ role: 'user', content: prompt }],
        stream: false, 
      }),
    });
    const data = await response.json();
    return NextResponse.json({ content: data.message.content });
  } catch (error) {
    return NextResponse.json({ error: "AI Error" }, { status: 500 });
  }
}
