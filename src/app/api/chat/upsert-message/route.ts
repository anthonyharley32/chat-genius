import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { message, metadata } = await req.json();
    
    // Hardcode the URL since we're in Docker
    const backendUrl = 'http://ai-service:8000';
    
    // Log the full URL we're about to call
    const fullUrl = `${backendUrl}/api/chat/upsert-message`;
    console.log('Attempting to call:', fullUrl);
    console.log('With message:', message);
    console.log('With metadata:', metadata);

    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message, metadata })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Backend error:', errorText);
      throw new Error(`Backend responded with status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Successfully upserted message');
    return NextResponse.json(data);

  } catch (error) {
    console.error('Error in upsert-message route:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upsert message' },
      { status: 500 }
    );
  }
} 