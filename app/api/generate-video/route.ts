import { NextRequest, NextResponse } from "next/server";

// Hugging Face Inference API for free video generation
const HF_API_URL = "https://api-inference.huggingface.co/models/ali-vilab/text-to-video-ms-1.7b";

export async function POST(request: NextRequest) {
  try {
    const { prompt, niche, tone } = await request.json();

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    const hfToken = process.env.HF_TOKEN;
    
    if (!hfToken) {
      return NextResponse.json(
        { error: "HF_TOKEN environment variable is not configured. Get your free token at https://huggingface.co/settings/tokens" },
        { status: 500 }
      );
    }

    // Create an enhanced prompt for video generation
    const enhancedPrompt = `${prompt}, ${niche.toLowerCase()} style, ${tone.toLowerCase()} mood, cinematic, high quality, smooth motion`;

    // Call Hugging Face Inference API
    const response = await fetch(HF_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${hfToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: enhancedPrompt,
        parameters: {
          num_frames: 16,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      
      // Check if model is loading
      if (response.status === 503) {
        return NextResponse.json(
          { error: "Model is loading. Please wait 30-60 seconds and try again.", loading: true },
          { status: 503 }
        );
      }
      
      throw new Error(`Hugging Face API error: ${response.status} - ${errorText}`);
    }

    // The response is a video blob
    const videoBlob = await response.blob();
    
    // Convert blob to base64 data URL
    const arrayBuffer = await videoBlob.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const mimeType = videoBlob.type || 'video/mp4';
    const dataUrl = `data:${mimeType};base64,${base64}`;

    return NextResponse.json({
      success: true,
      videoUrl: dataUrl,
      message: "Video generated successfully using Hugging Face (free tier)",
    });
  } catch (error: unknown) {
    console.error("Video generation error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to generate video";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}