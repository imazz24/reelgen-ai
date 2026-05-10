'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

// Total video duration: ~9 seconds, split into 3 scenes.
const SCENE_MS = 3000;
const SCENES = 3;

type AdParts = { headline: string; body: string; cta: string };

function parseAdCopy(raw: string, fallback: AdParts): AdParts {
  const grab = (label: string): string | null => {
    const re = new RegExp(`${label}\\s*:?\\s*(.+?)(?=\\n\\s*(?:Headline|Body|CTA|Call to action)|$)`, 'is');
    const m = raw.match(re);
    return m ? m[1].trim().replace(/^[*_"\s]+|[*_"\s]+$/g, '') : null;
  };
  return {
    headline: grab('Headline') || fallback.headline,
    body: grab('Body') || fallback.body,
    cta: grab('CTA') || grab('Call to action') || fallback.cta,
  };
}

export default function Home() {
  const [productName, setProductName] = useState('');
  const [productDesc, setProductDesc] = useState('');
  const [adPlatform, setAdPlatform] = useState('facebook');
  const [adTone, setAdTone] = useState('friendly');
  const [loading, setLoading] = useState(false);
  const [adCopy, setAdCopy] = useState('');
  const [heroImage, setHeroImage] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  async function generateAd() {
    if (!productName || !productDesc) {
      alert('Fill in product name and features!');
      return;
    }

    setLoading(true);
    setShowPreview(false);
    setAdCopy('');
    setHeroImage('');
    setErrorMsg('');

    try {
      const res = await fetch('/api/generate-ad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productName, productDesc, adPlatform, adTone }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);

      setAdCopy(data.adCopy || '');
      setHeroImage(data.imageUrl || '');
      setShowPreview(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg);
      setShowPreview(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.body}>
      <div style={styles.container}>
        <h1 style={styles.h1}>Free AI Ad Generator</h1>
        <p style={styles.subtitle}>
          Generate a professional product video + ad copy in seconds — preview only, no download.
        </p>

        <div style={styles.formGroup}>
          <label style={styles.label}>Product/Service Name</label>
          <input
            type="text"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            placeholder="e.g. Eco-Friendly Water Bottle"
            style={styles.input}
            required
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Key Features/Benefits</label>
          <textarea
            value={productDesc}
            onChange={(e) => setProductDesc(e.target.value)}
            placeholder="e.g. BPA-free, reusable, leak-proof, sustainable"
            style={styles.textarea}
            required
          />
        </div>

        <div style={styles.row}>
          <div style={{ ...styles.formGroup, flex: 1 }}>
            <label style={styles.label}>Ad Platform</label>
            <select value={adPlatform} onChange={(e) => setAdPlatform(e.target.value)} style={styles.select}>
              <option value="facebook">Facebook/Instagram</option>
              <option value="google">Google Search</option>
              <option value="tiktok">TikTok/Reels</option>
              <option value="banner">Website Banner</option>
            </select>
          </div>
          <div style={{ ...styles.formGroup, flex: 1 }}>
            <label style={styles.label}>Tone</label>
            <select value={adTone} onChange={(e) => setAdTone(e.target.value)} style={styles.select}>
              <option value="friendly">Friendly</option>
              <option value="urgent">Urgent</option>
              <option value="professional">Professional</option>
              <option value="playful">Playful</option>
            </select>
          </div>
        </div>

        <button
          style={{ ...styles.btnGenerate, ...(loading ? styles.btnDisabled : {}) }}
          onClick={generateAd}
          disabled={loading}
        >
          {loading ? 'Generating…' : 'Generate AI Ad Video'}
        </button>

        {loading && (
          <div style={styles.loading}>Generating your ad video with free AI… 5–30 seconds.</div>
        )}

        {showPreview && (
          <div style={styles.adPreview}>
            <h3 style={styles.previewTitle}>Your AI-Generated Ad Video</h3>

            {errorMsg && (
              <div style={styles.errorBox}>
                <strong>Could not generate ad:</strong> {errorMsg}
              </div>
            )}

            {!errorMsg && adCopy && (
              <AdVideoPlayer
                productName={productName}
                productDesc={productDesc}
                adPlatform={adPlatform}
                adCopy={adCopy}
                heroImage={heroImage}
              />
            )}

            {adCopy && (
              <div style={styles.adCopyBox}>
                {adCopy.split('\n').map((line, i) => (
                  <p key={i} style={styles.adCopyLine}>{line}</p>
                ))}
              </div>
            )}

            <div style={styles.noDownloadNote}>
              ⚠️ This is a demo only. You can view the ad but{' '}
              <strong>cannot download, save, or export</strong> it.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AdVideoPlayer({
  productName,
  productDesc,
  adPlatform,
  adCopy,
  heroImage,
}: {
  productName: string;
  productDesc: string;
  adPlatform: string;
  adCopy: string;
  heroImage: string;
}) {
  const parts = useMemo(
    () =>
      parseAdCopy(adCopy, {
        headline: productName,
        body: productDesc,
        cta: 'Shop Now',
      }),
    [adCopy, productName, productDesc]
  );

  const [scene, setScene] = useState(0);
  const [progress, setProgress] = useState(0);
  const [tick, setTick] = useState(0); // forces full restart on each loop
  const startRef = useRef<number>(Date.now());

  useEffect(() => {
    const id = setInterval(() => {
      setScene((s) => {
        const next = s + 1;
        if (next >= SCENES) {
          setTick((t) => t + 1);
          return 0;
        }
        return next;
      });
    }, SCENE_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    startRef.current = Date.now();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProgress(0);
    const id = setInterval(() => {
      const elapsed = (Date.now() - startRef.current) / SCENE_MS;
      setProgress(Math.min(elapsed, 1));
    }, 50);
    return () => clearInterval(id);
  }, [scene, tick]);

  const totalProgress = ((scene + progress) / SCENES) * 100;
  const block = (e: React.SyntheticEvent) => e.preventDefault();

  // Each scene picks a Ken Burns direction so motion looks intentional.
  const kbClass = ['kb-in', 'kb-out', 'kb-in'][scene];

  const features = productDesc
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 4);

  return (
    <div style={styles.videoFrame} onContextMenu={block} onDragStart={block}>
      {/* Background: AI hero image, or fallback animated gradient */}
      <div key={`bg-${tick}`} style={styles.videoBg} className={kbClass}>
        {heroImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={heroImage}
            alt={`${productName} hero`}
            draggable={false}
            style={styles.videoBgImg}
          />
        ) : (
          <div style={styles.videoFallbackBg} />
        )}
      </div>

      {/* Cinematic vignette + bottom dim */}
      <div style={styles.videoVignette} />

      {/* Scene-specific text overlays */}
      <div style={styles.videoSceneStage}>
        {scene === 0 && (
          <div key={`s0-${tick}`} className="animate-slideUp" style={styles.sceneCenter}>
            <div style={styles.eyebrow}>{adPlatform.toUpperCase()} · {productName}</div>
            <div style={styles.headline}>{parts.headline}</div>
          </div>
        )}

        {scene === 1 && (
          <div key={`s1-${tick}`} className="animate-fadeIn" style={styles.sceneCenter}>
            <div style={styles.bodyText}>{parts.body}</div>
            {features.length > 0 && (
              <ul style={styles.featureList}>
                {features.map((f, i) => (
                  <li key={i} style={styles.featureItem}>
                    <span style={styles.featureBullet}>✓</span> {f}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {scene === 2 && (
          <div key={`s2-${tick}`} className="animate-scaleIn" style={styles.sceneCenter}>
            <div style={styles.ctaLabel}>{parts.cta}</div>
            <div style={styles.ctaButton}>{productName} →</div>
          </div>
        )}
      </div>

      {/* Top bar: REC badge + scene label */}
      <div style={styles.videoTopBar}>
        <div style={styles.videoBadge}>
          <span style={styles.recDot} className="rec-dot" />
          <span>AI VIDEO</span>
        </div>
        <div style={styles.videoSceneLabel}>Scene {scene + 1}/{SCENES}</div>
      </div>

      {/* Bottom bar: title + watermark */}
      <div style={styles.videoBottomBar}>
        <div style={styles.videoTitle}>{productName}</div>
        <div style={styles.videoWatermark}>DEMO PREVIEW · NO DOWNLOAD</div>
      </div>

      {/* Progress bar */}
      <div style={styles.videoProgressTrack}>
        <div style={{ ...styles.videoProgressFill, width: `${totalProgress}%` }} />
      </div>

      {/* Transparent blocker to prevent right-click save through the image */}
      <div style={styles.videoBlocker} />
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  body: {
    background: 'linear-gradient(135deg, #eef2ff 0%, #f0f4f8 100%)',
    padding: '2rem',
    maxWidth: '1000px',
    margin: '0 auto',
    minHeight: '100vh',
    fontFamily: "'Inter', sans-serif",
  },
  container: {
    background: 'white',
    padding: '2rem',
    borderRadius: '16px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
  },
  h1: { color: '#0f172a', marginBottom: '0.25rem', textAlign: 'center', fontSize: '1.8rem' },
  subtitle: { color: '#64748b', textAlign: 'center', marginTop: 0, marginBottom: '2rem', fontSize: '0.95rem' },
  row: { display: 'flex', gap: '1rem' },
  formGroup: { marginBottom: '1.2rem' },
  label: { display: 'block', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' },
  input: {
    width: '100%', padding: '0.8rem', border: '1px solid #e2e8f0',
    borderRadius: '8px', fontSize: '1rem', boxSizing: 'border-box', color: '#000',
  },
  textarea: {
    width: '100%', padding: '0.8rem', border: '1px solid #e2e8f0',
    borderRadius: '8px', fontSize: '1rem', minHeight: '100px', resize: 'vertical',
    boxSizing: 'border-box', color: '#000',
  },
  select: {
    width: '100%', padding: '0.8rem', border: '1px solid #e2e8f0',
    borderRadius: '8px', fontSize: '1rem', boxSizing: 'border-box', color: '#000', background: 'white',
  },
  btnGenerate: {
    width: '100%', padding: '1rem',
    background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
    color: 'white', border: 'none', borderRadius: '10px',
    fontSize: '1.1rem', fontWeight: 700, cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
  },
  btnDisabled: { background: '#94a3b8', cursor: 'not-allowed', boxShadow: 'none' },
  loading: { textAlign: 'center', padding: '1rem', color: '#64748b' },
  adPreview: { marginTop: '2rem', padding: '1.5rem', background: '#f8fafc', borderRadius: '12px' },
  previewTitle: { color: '#0f172a', marginTop: 0, marginBottom: '1rem' },

  // ---- Video player ----
  videoFrame: {
    position: 'relative',
    width: '100%',
    aspectRatio: '16 / 9',
    overflow: 'hidden',
    borderRadius: '14px',
    background: '#000',
    boxShadow: '0 18px 40px rgba(15, 23, 42, 0.35), 0 2px 6px rgba(15, 23, 42, 0.2)',
    marginBottom: '1rem',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    color: 'white',
  },
  videoBg: { position: 'absolute', inset: 0, width: '100%', height: '100%' },
  videoBgImg: { width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' },
  videoFallbackBg: {
    width: '100%', height: '100%',
    background:
      'radial-gradient(at 20% 20%, #6366f1 0%, transparent 60%),' +
      'radial-gradient(at 80% 30%, #ec4899 0%, transparent 55%),' +
      'radial-gradient(at 60% 90%, #06b6d4 0%, transparent 60%),' +
      'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
  },
  videoVignette: {
    position: 'absolute', inset: 0,
    background:
      'radial-gradient(ellipse at center, rgba(0,0,0,0) 50%, rgba(0,0,0,0.65) 100%),' +
      'linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0) 25%, rgba(0,0,0,0) 60%, rgba(0,0,0,0.7) 100%)',
    pointerEvents: 'none',
  },
  videoSceneStage: {
    position: 'absolute', inset: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '3rem 2rem',
    pointerEvents: 'none',
  },
  sceneCenter: { textAlign: 'center', maxWidth: '85%' },
  eyebrow: {
    fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.18em',
    color: 'rgba(255,255,255,0.85)', marginBottom: '0.75rem',
    textShadow: '0 2px 6px rgba(0,0,0,0.6)',
  },
  headline: {
    fontSize: 'clamp(1.6rem, 4.5vw, 3rem)', fontWeight: 900,
    lineHeight: 1.1, letterSpacing: '-0.02em',
    textShadow: '0 4px 20px rgba(0,0,0,0.75)',
  },
  bodyText: {
    fontSize: 'clamp(1rem, 2vw, 1.35rem)', fontWeight: 500,
    lineHeight: 1.5, marginBottom: '1rem',
    textShadow: '0 2px 10px rgba(0,0,0,0.7)',
  },
  featureList: {
    listStyle: 'none', padding: 0, margin: 0,
    display: 'inline-flex', flexDirection: 'column', gap: '0.4rem',
    textAlign: 'left',
  },
  featureItem: {
    fontSize: 'clamp(0.9rem, 1.6vw, 1.1rem)', fontWeight: 600,
    textShadow: '0 2px 6px rgba(0,0,0,0.7)',
  },
  featureBullet: {
    display: 'inline-block', width: '1.4rem', height: '1.4rem',
    background: 'linear-gradient(135deg, #34d399, #06b6d4)',
    color: 'white', borderRadius: '50%', textAlign: 'center',
    lineHeight: '1.4rem', marginRight: '0.5rem', fontWeight: 800,
    fontSize: '0.85rem',
  },
  ctaLabel: {
    fontSize: 'clamp(1.1rem, 2.4vw, 1.6rem)', fontWeight: 600,
    marginBottom: '1.25rem', textShadow: '0 2px 10px rgba(0,0,0,0.7)',
  },
  ctaButton: {
    display: 'inline-block',
    background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
    color: 'white', fontSize: 'clamp(1.1rem, 2.4vw, 1.5rem)',
    fontWeight: 800, letterSpacing: '0.02em',
    padding: '0.85rem 2rem', borderRadius: '999px',
    boxShadow: '0 12px 30px rgba(239, 68, 68, 0.45)',
  },
  videoTopBar: {
    position: 'absolute', top: '0.9rem', left: '0.9rem', right: '0.9rem',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    color: 'white', fontSize: '0.78rem', fontWeight: 600,
    letterSpacing: '0.05em', textShadow: '0 1px 2px rgba(0,0,0,0.6)',
    pointerEvents: 'none',
  },
  videoBadge: {
    display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
    background: 'rgba(220, 38, 38, 0.95)', padding: '0.25rem 0.6rem',
    borderRadius: '999px', fontSize: '0.7rem', letterSpacing: '0.1em',
  },
  recDot: { width: '0.5rem', height: '0.5rem', background: 'white', borderRadius: '50%', display: 'inline-block' },
  videoSceneLabel: {
    background: 'rgba(0, 0, 0, 0.45)', padding: '0.25rem 0.6rem',
    borderRadius: '6px', fontSize: '0.72rem',
  },
  videoBottomBar: {
    position: 'absolute', bottom: '1.1rem', left: '1rem', right: '1rem',
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
    color: 'white', pointerEvents: 'none',
  },
  videoTitle: {
    fontSize: '1.1rem', fontWeight: 700, letterSpacing: '-0.01em',
    textShadow: '0 2px 8px rgba(0,0,0,0.7)', maxWidth: '70%',
    opacity: 0.85,
  },
  videoWatermark: {
    fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.18em',
    color: 'rgba(255,255,255,0.85)', background: 'rgba(0,0,0,0.4)',
    padding: '0.3rem 0.6rem', borderRadius: '4px',
    border: '1px solid rgba(255,255,255,0.2)',
  },
  videoProgressTrack: {
    position: 'absolute', left: 0, right: 0, bottom: 0, height: '3px',
    background: 'rgba(255,255,255,0.15)', pointerEvents: 'none',
  },
  videoProgressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #60a5fa, #a78bfa)',
    transition: 'width 50ms linear',
  },
  videoBlocker: { position: 'absolute', inset: 0, background: 'transparent' },

  adCopyBox: {
    background: 'white', padding: '1.25rem', borderRadius: '10px',
    marginBottom: '1rem', lineHeight: 1.6, color: '#1e293b',
    border: '1px solid #e2e8f0',
  },
  adCopyLine: { margin: '0 0 0.5rem 0' },
  noDownloadNote: {
    color: '#7f1d1d', fontWeight: 600, textAlign: 'center',
    marginTop: '1rem', padding: '0.8rem', background: '#fee2e2',
    borderRadius: '8px', border: '1px solid #fecaca',
  },
  errorBox: {
    color: '#7f1d1d', background: '#fef2f2',
    border: '1px solid #fecaca', padding: '1rem',
    borderRadius: '8px', marginBottom: '1rem', fontWeight: 600,
  },
};
