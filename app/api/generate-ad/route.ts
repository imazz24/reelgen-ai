import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { productName, productDesc, adPlatform, adTone } = await request.json();

    if (!productName || !productDesc) {
      return NextResponse.json(
        { error: "productName and productDesc are required" },
        { status: 400 }
      );
    }

    const userPrompt = `Write a high-converting ${adTone} ad for "${productName}" (${productDesc}) on ${adPlatform}. Format as plain text with three labeled sections exactly:

Headline: <one line>
Body: <2-3 sentences>
CTA: <short call to action>

No markdown, no preamble, no quotes around the output.`;

    const pollRes = await fetch("https://text.pollinations.ai/openai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openai",
        messages: [
          { role: "system", content: "You are an expert direct-response copywriter." },
          { role: "user", content: userPrompt },
        ],
        seed: Math.floor(Math.random() * 1_000_000),
      }),
    });

    if (!pollRes.ok) {
      const detail = await pollRes.text().catch(() => "");
      return NextResponse.json(
        { error: `Pollinations text API ${pollRes.status}: ${detail.slice(0, 200)}` },
        { status: 502 }
      );
    }

    const ct = pollRes.headers.get("content-type") || "";
    let adCopy = "";
    if (ct.includes("application/json")) {
      const data = await pollRes.json();
      adCopy = data?.choices?.[0]?.message?.content?.trim() || "";
    } else {
      adCopy = (await pollRes.text()).trim();
    }

    if (!adCopy) {
      return NextResponse.json(
        { error: "Empty response from text API — try again." },
        { status: 502 }
      );
    }

    // Best-effort: fetch ONE Pollinations background image (free tier allows
    // 1 queued request per IP). The video player will fall back to an
    // animated gradient if this fails — so the user always sees a video.
    const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

    const imagePrompt = `cinematic hero product shot of ${productName}: ${productDesc}. ${adTone} mood, ${adPlatform} ad campaign style, dramatic lighting, ultra high quality, professional marketing photography, no text, no watermark, no logo`;

    async function fetchHeroImage(): Promise<string | null> {
      const backoffs = [0, 3000, 7000];
      for (const delay of backoffs) {
        if (delay) await sleep(delay);
        const seed = Math.floor(Math.random() * 1_000_000);
        const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(
          imagePrompt
        )}?width=1280&height=720&seed=${seed}&nologo=true`;
        try {
          const res = await fetch(url, { signal: AbortSignal.timeout(90_000) });
          if (!res.ok) continue;
          const contentType = res.headers.get("content-type") || "image/jpeg";
          if (!contentType.startsWith("image/")) continue;
          const buf = Buffer.from(await res.arrayBuffer());
          return `data:${contentType};base64,${buf.toString("base64")}`;
        } catch {
          // keep trying
        }
      }
      return null;
    }

    const heroImage = await fetchHeroImage();

    return NextResponse.json({
      adCopy,
      imageUrl: heroImage || "",
      hasImage: !!heroImage,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
