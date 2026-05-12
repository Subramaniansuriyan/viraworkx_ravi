// @ts-nocheck
// ViraWorkXLanding.jsx
// Drop-in React component for ViraWorkX marketing page.
// Default export, no required props, no external CSS dependency.
// Uses Inter from Google Fonts (loaded via <link>) and inline styles.
//
// IMAGE ASSETS: Place these files in your /public folder before deploying:
//   /public/logo-lockup.png   (V/X mark + "ViraWorkX" wordmark, used in nav)
//   /public/logo-full.png     (V/X mark + "ViraWorkX" + "Startup Ready Talent" tagline, used in footer)
//   /public/founder-rahul.jpg (Rahul's headshot, used in hero card and founder bio)
//
// Usage:
//   import ViraWorkXLanding from './ViraWorkXLanding'
//   <ViraWorkXLanding />
//
// Note: For SEO and social previews, this component should ideally render
// server-side (Next.js, Astro, Vite SSR). Client-side rendering means crawlers,
// LinkedIn previews, and email scanners will see blank content until JS executes.

import React, { useEffect, useState } from 'react';

// ============================================================
// EMBEDDED ASSETS (extract to /public folder if you want smaller bundle)
// ============================================================
const LOGO_LOCKUP = '/logo-lockup.png';
const LOGO_FULL = '/logo-full.png';
const FOUNDER_PHOTO = '/founder-rahul.jpg';

const CALENDLY_URL = 'https://calendly.com/rahul-viraworkx/30min';

// ============================================================
// DESIGN TOKENS
// ============================================================
const tokens = {
  ink: '#18141f',
  inkSoft: '#2a2434',
  inkMute: '#6b6376',
  inkFaint: '#a8a2b3',
  paper: '#ffffff',
  paperLine: '#ebe7e0',
  lavender: '#f5f2ff',
  lavenderLine: '#e0d6ff',
  softGray: '#f8f7f5',
  brandPurple: '#512682',
  brandPurpleDeep: '#3D1A65',
  brandPurpleSoft: '#7d4eb8',
  accent: '#7c3aed',
  accentSoft: '#a78bfa',
  accentDeep: '#5b21b6',
  sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
};

// ============================================================
// CSS (injected once into <head> — handles fonts, media queries, hover, animations)
// ============================================================
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,300..700;1,300..700&display=swap');

  .vwx * { box-sizing: border-box; }
  .vwx { font-family: ${tokens.sans}; line-height: 1.5; color: ${tokens.ink}; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
  .vwx h1, .vwx h2, .vwx h3, .vwx h4, .vwx p { margin: 0; }
  .vwx a { color: inherit; text-decoration: none; }

  /* Hero animation */
  @keyframes vwx-rise {
    from { opacity: 0; transform: translateY(28px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes vwx-float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-6px); }
  }
  @media (prefers-reduced-motion: no-preference) {
    .vwx .vwx-rise-1 { opacity: 0; animation: vwx-rise 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.05s forwards; }
    .vwx .vwx-rise-2 { opacity: 0; animation: vwx-rise 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.18s forwards; }
    .vwx .vwx-fade-1 { opacity: 0; animation: vwx-rise 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.12s forwards; }
    .vwx .vwx-fade-2 { opacity: 0; animation: vwx-rise 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.2s forwards; }
    .vwx .vwx-fade-3 { opacity: 0; animation: vwx-rise 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.28s forwards; }
    .vwx .vwx-section-reveal { opacity: 0; animation: vwx-rise 0.9s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    .vwx .vwx-founder-photo { animation: vwx-float 4.2s ease-in-out infinite; }
    .vwx .vwx-step { opacity: 0; animation: vwx-rise 0.65s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    .vwx .vwx-steps .vwx-step:nth-child(1) { animation-delay: 0.08s; }
    .vwx .vwx-steps .vwx-step:nth-child(2) { animation-delay: 0.16s; }
    .vwx .vwx-steps .vwx-step:nth-child(3) { animation-delay: 0.24s; }
  }

  /* Pulse dot */
  @keyframes vwx-pulse {
    0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(124, 58, 237, 0.4); }
    50% { opacity: 0.7; box-shadow: 0 0 0 6px rgba(124, 58, 237, 0); }
  }
  .vwx .vwx-dot { animation: vwx-pulse 2s ease-in-out infinite; }

  /* Hover effects */
  .vwx .vwx-btn-primary { transition: transform 0.15s, background 0.15s; }
  .vwx .vwx-btn-primary:hover { background: ${tokens.accentDeep}; transform: translateY(-1px); }
  .vwx .vwx-btn-primary svg { transition: transform 0.2s; }
  .vwx .vwx-btn-primary:hover svg { transform: translate(2px, -2px); }

  .vwx .vwx-btn-secondary { transition: background 0.15s, color 0.15s; }
  .vwx .vwx-btn-secondary:hover { background: ${tokens.ink}; color: ${tokens.paper}; }

  .vwx .vwx-cta-light { transition: transform 0.15s, background 0.15s; }
  .vwx .vwx-cta-light:hover { background: rgba(255,255,255,0.92); transform: translateY(-1px); }
  .vwx .vwx-cta-light svg { transition: transform 0.2s; }
  .vwx .vwx-cta-light:hover svg { transform: translate(2px, -2px); }

  .vwx .vwx-nav-cta { transition: transform 0.15s, background 0.15s, color 0.15s; }
  .vwx .vwx-nav-cta:hover { background: ${tokens.accentDeep}; color: ${tokens.paper}; transform: translateY(-1px); }

  .vwx .vwx-nav-link { transition: color 0.15s; }
  .vwx .vwx-nav-link:hover { color: ${tokens.ink}; }

  .vwx .vwx-step { transition: transform 0.25s ease, box-shadow 0.25s ease, background 0.25s ease; }
  .vwx .vwx-step:hover { transform: translateY(-3px); box-shadow: 0 16px 36px -18px rgba(24, 20, 31, 0.12); background: ${tokens.lavender}; }

  .vwx .vwx-role { transition: background 0.2s; }
  .vwx .vwx-role:hover { background: ${tokens.lavender}; }

  .vwx .vwx-faq summary { cursor: pointer; list-style: none; transition: color 0.2s; }
  .vwx .vwx-faq summary::-webkit-details-marker { display: none; }
  .vwx .vwx-faq summary:hover { color: ${tokens.brandPurple}; }
  .vwx .vwx-faq[open] .vwx-faq-icon { transform: rotate(45deg); background: ${tokens.ink}; color: ${tokens.paper}; }
  .vwx .vwx-faq-icon { transition: transform 0.25s, background 0.2s, color 0.2s; }

  .vwx .vwx-footer-link { transition: color 0.15s; }
  .vwx .vwx-footer-link:hover { color: ${tokens.brandPurple}; }

  /* Drop cap on founder bio first paragraph */
  .vwx .vwx-founder-bio p:first-of-type::first-letter {
    font-weight: 600;
    font-size: 60px;
    float: left;
    line-height: 0.9;
    margin-right: 10px;
    margin-top: 6px;
    color: ${tokens.paper};
  }

  /* ============ DESKTOP DEFAULTS ============ */
  .vwx-hero-grid { display: grid; grid-template-columns: 1.4fr 1fr; gap: 60px; align-items: start; }
  .vwx-steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
  .vwx-sample-grid { display: grid; grid-template-columns: 1fr 1.1fr; gap: 56px; align-items: center; }
  .vwx-founder-block { display: grid; grid-template-columns: 0.85fr 1.15fr; gap: 64px; align-items: start; }
  .vwx-roles-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; background: ${tokens.paperLine}; border: 1px solid ${tokens.paperLine}; border-radius: 20px; overflow: hidden; }
  .vwx-footer-grid { display: grid; grid-template-columns: 1.5fr 1fr 1fr 1fr; gap: 48px; margin-bottom: 40px; }

  /* Calculator slider thumb */
  .vwx-calc-slider::-webkit-slider-thumb {
    -webkit-appearance: none; appearance: none;
    width: 22px; height: 22px;
    background: ${tokens.brandPurple};
    border-radius: 50%; cursor: pointer;
    border: 3px solid ${tokens.paper};
    box-shadow: 0 2px 8px rgba(81, 38, 130, 0.4);
    transition: transform .1s;
  }
  .vwx-calc-slider::-webkit-slider-thumb:hover { transform: scale(1.1); }
  .vwx-calc-slider::-moz-range-thumb {
    width: 22px; height: 22px;
    background: ${tokens.brandPurple};
    border-radius: 50%; cursor: pointer;
    border: 3px solid ${tokens.paper};
    box-shadow: 0 2px 8px rgba(81, 38, 130, 0.4);
  }
  .vwx-calc-cta { transition: transform 0.15s, background 0.15s; }
  .vwx-calc-cta:hover { background: ${tokens.brandPurple}; transform: translateY(-1px); }

  /* ============ TABLET ============ */
  @media (max-width: 980px) {
    .vwx-hero-grid { grid-template-columns: 1fr; gap: 40px; }
  }
  @media (max-width: 880px) {
    .vwx-nav-link-hide { display: none !important; }
    .vwx-steps { grid-template-columns: 1fr; }
    .vwx-sample-grid { grid-template-columns: 1fr; gap: 36px; }
    .vwx-founder-block { grid-template-columns: 1fr; gap: 40px; }
    .vwx-roles-grid { grid-template-columns: repeat(2, 1fr); }
  }

  /* ============ MOBILE ============ */
  @media (max-width: 720px) {
    .vwx-container { padding: 0 20px !important; }
    .vwx-hero { padding: 40px 0 56px !important; }
    .vwx-h1 { font-size: clamp(34px, 9vw, 44px) !important; line-height: 1.05 !important; }
    .vwx-section-pad { padding: 56px 0 !important; }
    .vwx-section-title { font-size: clamp(28px, 7vw, 36px) !important; line-height: 1.1 !important; }
    .vwx-section-header { margin-bottom: 40px !important; }
    .vwx-sample-section { padding: 40px 24px !important; margin: 0 16px !important; border-radius: 20px !important; }
    .vwx-cta-section { padding: 44px 22px !important; margin: 0 16px !important; border-radius: 20px !important; }
    .vwx-cta-section h2 { font-size: clamp(28px, 8vw, 38px) !important; }
    .vwx-founder-portrait { max-width: 100% !important; aspect-ratio: 1/1.1 !important; }
    .vwx-founder-bio-h2 { font-size: clamp(26px, 7vw, 34px) !important; line-height: 1.12 !important; }
    .vwx-step { padding: 28px 22px !important; }
    .vwx-role { padding: 24px 20px !important; }
    .vwx-faq-summary { font-size: 17px !important; }
    .vwx-roles-grid { grid-template-columns: 1fr !important; }
    .vwx-profile-row { flex-direction: column !important; align-items: flex-start !important; gap: 6px !important; }
    .vwx-profile-row > span:last-child { text-align: left !important; }
    .vwx-profile-stack { justify-content: flex-start !important; }
    .vwx-footer-grid { grid-template-columns: 1fr 1fr !important; gap: 32px !important; }
    .vwx-footer-bottom { flex-direction: column !important; align-items: flex-start !important; gap: 8px !important; font-size: 10.5px !important; }
    .vwx-logo-img { height: 30px !important; }
  }

  @media (max-width: 380px) {
    .vwx-cta-row { flex-direction: column !important; align-items: stretch !important; }
    .vwx-cta-row a { justify-content: center; width: 100%; }
    .vwx-founder-stats { grid-template-columns: 1fr 1fr !important; row-gap: 16px !important; }
    .vwx-founder-stats > div:last-child { grid-column: 1 / -1 !important; text-align: center; }
  }
`;

// ============================================================
// REUSABLE INLINE COMPONENTS
// ============================================================
const ArrowUpRight = ({ size = 12 }) => (
  <svg width={size} height={size} viewBox="0 0 12 12" fill="none" style={{ display: 'inline-block' }}>
    <path d="M2.5 9.5L9.5 2.5M9.5 2.5H4M9.5 2.5V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Inter doesn't have a "wonk" italic like Instrument Serif, so we style emphasis with italic + brand color + slightly heavier weight
const Em = ({ children, color = tokens.brandPurple }) => (
  <em style={{ fontStyle: 'italic', fontWeight: 500, color }}>{children}</em>
);

// ============================================================
// CALCULATOR SECTION
// ============================================================
const TIER_RATES = { '1': 45, '2': 35, '3': 27.5 };
const TIER_LABELS = { '1': 'Tier 1 — Senior', '2': 'Tier 2 — Mid', '3': 'Tier 3 — Junior' };
const HOURS_PER_YEAR = 1880;
const US_BASE = 130000;
const US_TOTAL = US_BASE + (US_BASE * 0.20) + 4000 + 9000; // $169K

const fmtK = (n) => '$' + Math.round(n / 1000) + 'K';
const fmtFull = (n) => '$' + Math.round(n).toLocaleString('en-US');

const CalculatorSection = () => {
  const [tier, setTier] = useState('1');
  const [count, setCount] = useState(1);

  const rate = TIER_RATES[tier];
  const vwxPer = rate * HOURS_PER_YEAR;
  const totalUs = US_TOTAL * count;
  const totalVwx = vwxPer * count;
  const savings = totalUs - totalVwx;
  const pct = Math.round(((US_TOTAL - vwxPer) / US_TOTAL) * 100);

  const usDisplay = count === 1 ? fmtK(US_TOTAL) : fmtK(totalUs);
  const vwxDisplay = count === 1 ? fmtK(vwxPer) : fmtK(totalVwx);
  const pctText = count === 1 ? `${pct}% lower than hiring in the US` : `${pct}% lower across ${count} engineers`;
  const countLabel = count === 1 ? '1 engineer' : `${count} engineers`;

  return (
    <section id="calculator" style={{ padding: '0 0 88px' }}>
      <div className="vwx-sample-section" style={{
        background: tokens.brandPurple, color: tokens.paper, borderRadius: 28,
        padding: '56px 48px', margin: '0 32px', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: '-30%', left: '-10%', width: 600, height: 600,
          background: 'radial-gradient(circle, rgba(167, 139, 250, 0.18), transparent 60%)', pointerEvents: 'none',
        }}></div>

        <div className="vwx-sample-grid" style={{ position: 'relative', zIndex: 2 }}>
          <div>
            <span style={{ fontSize: 11.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255, 255, 255, 0.7)', marginBottom: 20, display: 'inline-block', fontWeight: 500 }}>Burn rate calculator</span>
            <h2 className="vwx-section-title" style={{ fontWeight: 600, fontSize: 'clamp(34px, 4.5vw, 52px)', lineHeight: 1.05, letterSpacing: '-0.02em', color: tokens.paper, marginBottom: 20 }}>
              See what you save <em style={{ fontStyle: 'italic', fontWeight: 500, color: 'rgba(255,255,255,0.85)' }}>before the call.</em>
            </h2>
            <p style={{ fontSize: 17, lineHeight: 1.55, color: 'rgba(255, 255, 255, 0.78)', maxWidth: 460, marginBottom: 14 }}>
              US-based senior engineers cost $130K+ base, plus 30% loaded for benefits, taxes, equipment, recruiter fees. ViraWorkX engineers cost a fraction of that, with the same vetting bar.
            </p>
            <p style={{ fontSize: 17, lineHeight: 1.55, color: 'rgba(255, 255, 255, 0.78)', maxWidth: 460 }}>
              Move the slider. We'll show you the math.
            </p>
          </div>

          <div style={{
            background: tokens.paper, borderRadius: 18, padding: 28,
            boxShadow: '0 18px 50px -15px rgba(0, 0, 0, 0.25)',
          }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 11, letterSpacing: '0.06em',
              textTransform: 'uppercase', color: tokens.brandPurple, padding: '6px 12px',
              border: `1px solid ${tokens.lavenderLine}`, background: tokens.lavender,
              borderRadius: 999, marginBottom: 20, fontWeight: 500,
            }}>
              <span className="vwx-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: '#16a34a', boxShadow: '0 0 8px rgba(22, 163, 74, 0.5)' }}></span>
              Live calculation
            </div>
            <div style={{ fontWeight: 600, fontSize: 22, letterSpacing: '-0.018em', lineHeight: 1.1, marginBottom: 6, color: tokens.ink }}>How much does ViraWorkX save you?</div>
            <div style={{ fontFamily: tokens.sans, fontSize: 11.5, letterSpacing: '0.04em', textTransform: 'uppercase', color: tokens.inkMute, marginBottom: 24, fontWeight: 500 }}>Based on a 12-month engagement</div>

            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: 11, letterSpacing: '0.05em', textTransform: 'uppercase', color: tokens.inkMute, marginBottom: 10, fontWeight: 500 }}>
                <span>Tier</span>
                <span style={{ fontSize: 14, textTransform: 'none', letterSpacing: 0, color: tokens.ink, fontWeight: 600 }}>{TIER_LABELS[tier]}</span>
              </label>
              <select value={tier} onChange={(e) => setTier(e.target.value)} style={{
                width: '100%', padding: '13px 14px', border: `1px solid ${tokens.paperLine}`, borderRadius: 10,
                fontFamily: tokens.sans, fontSize: 14, color: tokens.ink, background: tokens.paper,
                cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none',
                backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%236b6376' d='M1 1l5 5 5-5'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center',
              }}>
                <option value="1">Tier 1 — Senior ($40–50/hr)</option>
                <option value="2">Tier 2 — Mid ($30–40/hr)</option>
                <option value="3">Tier 3 — Junior ($25–30/hr)</option>
              </select>
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: 11, letterSpacing: '0.05em', textTransform: 'uppercase', color: tokens.inkMute, marginBottom: 10, fontWeight: 500 }}>
                <span>Engineers needed</span>
                <span style={{ fontSize: 14, textTransform: 'none', letterSpacing: 0, color: tokens.ink, fontWeight: 600 }}>{countLabel}</span>
              </label>
              <input
                type="range" min="1" max="10" value={count}
                onChange={(e) => setCount(parseInt(e.target.value))}
                className="vwx-calc-slider"
                style={{
                  width: '100%', height: 6, WebkitAppearance: 'none', appearance: 'none',
                  background: tokens.paperLine, borderRadius: 999, outline: 'none', margin: '4px 0',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 10, color: tokens.inkFaint, letterSpacing: '0.04em', fontWeight: 500 }}>
                <span>1</span><span>3</span><span>5</span><span>7</span><span>10</span>
              </div>
            </div>

            <div style={{ marginTop: 28, paddingTop: 24, borderTop: `1px solid ${tokens.paperLine}` }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18 }}>
                <div style={{ padding: '16px 14px', borderRadius: 12, background: '#fef3f2', border: '1px solid #fecaca' }}>
                  <div style={{ fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#b91c1c', marginBottom: 8, fontWeight: 500 }}>Hire in US</div>
                  <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em', color: tokens.ink, lineHeight: 1, marginBottom: 4, fontVariantNumeric: 'tabular-nums' }}>{usDisplay}</div>
                  <div style={{ fontSize: 10, letterSpacing: '0.04em', textTransform: 'uppercase', color: tokens.inkMute, fontWeight: 500 }}>per engineer / yr</div>
                </div>
                <div style={{ padding: '16px 14px', borderRadius: 12, background: tokens.lavender, border: `1px solid ${tokens.lavenderLine}` }}>
                  <div style={{ fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', color: tokens.brandPurple, marginBottom: 8, fontWeight: 500 }}>Via ViraWorkX</div>
                  <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em', color: tokens.ink, lineHeight: 1, marginBottom: 4, fontVariantNumeric: 'tabular-nums' }}>{vwxDisplay}</div>
                  <div style={{ fontSize: 10, letterSpacing: '0.04em', textTransform: 'uppercase', color: tokens.inkMute, fontWeight: 500 }}>per engineer / yr</div>
                </div>
              </div>

              <div style={{
                background: `linear-gradient(135deg, ${tokens.brandPurple}, ${tokens.brandPurpleDeep})`,
                color: tokens.paper, borderRadius: 12, padding: 20, textAlign: 'center', marginBottom: 18,
                position: 'relative', overflow: 'hidden',
              }}>
                <div style={{ fontSize: 10.5, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255, 255, 255, 0.75)', marginBottom: 8, fontWeight: 500 }}>Annual savings</div>
                <div style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-0.025em', lineHeight: 1, marginBottom: 6, fontVariantNumeric: 'tabular-nums' }}>{fmtFull(savings)}</div>
                <div style={{ fontSize: 14, color: 'rgba(255, 255, 255, 0.85)', fontWeight: 500 }}>{pctText}</div>
              </div>

              <a href={CALENDLY_URL} target="_blank" rel="noopener noreferrer" className="vwx-calc-cta" style={{
                display: 'block', textAlign: 'center', background: tokens.ink, color: tokens.paper,
                padding: '14px 24px', borderRadius: 999, fontSize: 14.5, fontWeight: 500, textDecoration: 'none',
              }}>
                Book a 30-min call →
              </a>

              <p style={{
                marginTop: 14, fontSize: 10, letterSpacing: '0.04em', color: tokens.inkFaint,
                textAlign: 'center', lineHeight: 1.5, fontWeight: 500,
              }}>
                US cost = $130K base + 30% loaded (benefits, taxes, equipment, recruiter fees). ViraWorkX cost assumes 40 hrs/week × 47 weeks (PTO included). No lock-in. No minimum commitment.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function Landing() {
  // Inject the CSS once
  useEffect(() => {
    const id = 'vwx-styles';
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = CSS;
    document.head.appendChild(style);
    return () => {
      const s = document.getElementById(id);
      if (s) s.remove();
    };
  }, []);

  return (
    <div className="vwx" style={{ background: tokens.paper, color: tokens.ink, overflowX: 'hidden' }}>

      {/* ============ NAV ============ */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        backdropFilter: 'blur(20px) saturate(140%)',
        WebkitBackdropFilter: 'blur(20px) saturate(140%)',
        background: 'rgba(255, 255, 255, 0.82)',
        borderBottom: '1px solid rgba(24, 20, 31, 0.06)',
      }}>
        <div className="vwx-container" style={{ maxWidth: 1280, margin: '0 auto', padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 72 }}>
          <a href="/" aria-label="ViraWorkX home" style={{ display: 'flex', alignItems: 'center' }}>
            <img className="vwx-logo-img" src={LOGO_LOCKUP} alt="ViraWorkX" style={{ height: 36, width: 'auto', display: 'block' }} />
          </a>
          <div style={{ display: 'flex', gap: 30, alignItems: 'center' }}>
            <a href="#how" className="vwx-nav-link vwx-nav-link-hide" style={{ color: tokens.inkSoft, fontSize: 14, fontWeight: 450 }}>How It Works</a>
            <a href="#sample" className="vwx-nav-link vwx-nav-link-hide" style={{ color: tokens.inkSoft, fontSize: 14, fontWeight: 450 }}>How We Vet</a>
            <a href="#founder" className="vwx-nav-link vwx-nav-link-hide" style={{ color: tokens.inkSoft, fontSize: 14, fontWeight: 450 }}>Why Us</a>
            <a href="#faq" className="vwx-nav-link vwx-nav-link-hide" style={{ color: tokens.inkSoft, fontSize: 14, fontWeight: 450 }}>FAQ</a>
            <a href="/login" className="vwx-nav-cta" style={{
              background: tokens.brandPurple, color: tokens.paper, padding: '11px 22px', borderRadius: 999, fontSize: 14, fontWeight: 500,
            }}>
              Sign In
            </a>
            <a href={CALENDLY_URL} target="_blank" rel="noopener noreferrer" className="vwx-nav-cta" style={{
              background: tokens.ink, color: tokens.paper, padding: '11px 22px', borderRadius: 999, fontSize: 14, fontWeight: 500,
            }}>Book a Call</a>
          </div>
        </div>
      </nav>

      {/* ============ HERO ============ */}
      <section className="vwx-hero" style={{ padding: '56px 0 72px', position: 'relative', overflow: 'hidden' }}>
        <div className="vwx-container" style={{ maxWidth: 1280, margin: '0 auto', padding: '0 32px', position: 'relative', zIndex: 2 }}>
          <div className="vwx-hero-grid">
            <div className="vwx-rise-1">
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontSize: 11.5, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', color: tokens.inkMute, marginBottom: 22 }}>
                <span className="vwx-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: tokens.accent }}></span>
                <span>Pre-launch · Founder-led · Trial-protected</span>
              </div>
              <h1 className="vwx-h1 vwx-fade-1" style={{ fontWeight: 600, fontSize: 'clamp(40px, 6vw, 68px)', lineHeight: 1.0, letterSpacing: '-0.025em', color: tokens.ink, marginBottom: 22 }}>
                Founders hire founders.{' '}
                <Em>I take every first call.</Em>
              </h1>
              <p className="vwx-fade-2" style={{ fontSize: 17, lineHeight: 1.55, color: tokens.inkSoft, maxWidth: 540, marginBottom: 28 }}>
                ViraWorkX pairs US founders with senior engineers — matched in 48 hours, on a paid trial week, at 30–50% below US market rate. Built by an operator with 16 years of cross-border experience. No SDRs. No agency middlemen.
              </p>
              <div className="vwx-cta-row vwx-fade-3" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <a href={CALENDLY_URL} target="_blank" rel="noopener noreferrer" className="vwx-btn-primary" style={{
                  display: 'inline-flex', alignItems: 'center', gap: 10, background: tokens.ink, color: tokens.paper,
                  padding: '16px 26px', borderRadius: 999, fontSize: 15, fontWeight: 500,
                }}>
                  Book a 30-min call
                  <ArrowUpRight />
                </a>
                <a href="#sample" className="vwx-btn-secondary" style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8, color: tokens.ink,
                  padding: '16px 24px', borderRadius: 999, fontSize: 15, fontWeight: 500, border: `1px solid ${tokens.ink}`,
                }}>How we vet</a>
              </div>
            </div>

            {/* Founder hero card — deep brand purple */}
            <div className="vwx-rise-2" style={{
              background: tokens.brandPurple, color: tokens.paper, borderRadius: 24, padding: '32px 28px 28px',
              position: 'relative', overflow: 'hidden', boxShadow: '0 24px 50px -22px rgba(81, 38, 130, 0.4)',
            }}>
              <div style={{
                position: 'absolute', top: '-40%', right: '-30%', width: 380, height: 380,
                background: 'radial-gradient(circle, rgba(167, 139, 250, 0.25), transparent 70%)', pointerEvents: 'none',
              }}></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20, position: 'relative', zIndex: 2 }}>
                <img className="vwx-founder-photo" src={FOUNDER_PHOTO} alt="Rahul Ramachandran, Founder" style={{
                  width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255, 255, 255, 0.2)',
                }} />
                <div style={{ lineHeight: 1.35 }}>
                  <strong style={{ fontWeight: 500, fontSize: 16, letterSpacing: '-0.015em', display: 'block', color: tokens.paper }}>Rahul Ramachandran</strong>
                  <span style={{ fontSize: 11, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'rgba(255, 255, 255, 0.7)' }}>Founder · I take every first call</span>
                </div>
              </div>
              <p style={{
                fontStyle: 'italic', fontSize: 18, lineHeight: 1.5, letterSpacing: '-0.005em',
                marginBottom: 24, position: 'relative', zIndex: 2, color: 'rgba(255, 255, 255, 0.95)',
                fontWeight: 400,
              }}>
                "I've watched US founders burn $40K/month on average engineers. I've watched senior engineers get stuck in agency contracts that pay them peanuts. ViraWorkX is the network I wish existed on either side of that table."
              </p>
              <div className="vwx-founder-stats" style={{
                display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, paddingTop: 22,
                borderTop: '1px solid rgba(255, 255, 255, 0.18)', position: 'relative', zIndex: 2,
              }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 24, letterSpacing: '-0.015em', lineHeight: 1, marginBottom: 6, color: tokens.paper }}>16<span style={{ fontSize: 16, fontWeight: 500 }}>yr</span></div>
                  <div style={{ fontSize: 10, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'rgba(255, 255, 255, 0.65)', lineHeight: 1.3 }}>US-India ops</div>
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 24, letterSpacing: '-0.015em', lineHeight: 1, marginBottom: 6, color: tokens.paper }}>20→2.5K</div>
                  <div style={{ fontSize: 10, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'rgba(255, 255, 255, 0.65)', lineHeight: 1.3 }}>Scaled prior team</div>
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 24, letterSpacing: '-0.015em', lineHeight: 1, marginBottom: 6, color: tokens.paper }}>700→20</div>
                  <div style={{ fontSize: 10, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'rgba(255, 255, 255, 0.65)', lineHeight: 1.3 }}>Hand-vetted to network</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ TICKER ============ */}
      <div style={{
        borderTop: `1px solid ${tokens.paperLine}`, borderBottom: `1px solid ${tokens.paperLine}`,
        padding: '16px 0', background: tokens.softGray,
        fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase', color: tokens.inkMute, fontWeight: 500,
      }}>
        <div className="vwx-container" style={{ maxWidth: 1280, margin: '0 auto', padding: '0 32px', display: 'flex', gap: 32, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
          <span>Pre-vetted only</span>
          <span style={{ color: tokens.accent }}>·</span>
          <span>1-week paid trial</span>
          <span style={{ color: tokens.accent }}>·</span>
          <span>Guaranteed replacement</span>
          <span style={{ color: tokens.accent }}>·</span>
          <span>4–8 hr US timezone overlap</span>
          <span style={{ color: tokens.accent }}>·</span>
          <span>No agency markup</span>
        </div>
      </div>

      {/* ============ HOW IT WORKS ============ */}
      <section id="how" className="vwx-section-pad vwx-section-reveal" style={{ padding: '88px 0', position: 'relative', zIndex: 2 }}>
        <div className="vwx-container" style={{ maxWidth: 1280, margin: '0 auto', padding: '0 32px' }}>
          <div className="vwx-section-header" style={{ maxWidth: 760, marginBottom: 48 }}>
            <span style={{ fontSize: 11.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: tokens.brandPurple, marginBottom: 20, display: 'inline-block', fontWeight: 500 }}>How it works</span>
            <h2 className="vwx-section-title" style={{ fontWeight: 600, fontSize: 'clamp(34px, 4.5vw, 52px)', lineHeight: 1.05, letterSpacing: '-0.02em', color: tokens.ink, marginBottom: 20 }}>
              Brief to deployed engineer in <Em>under two weeks.</Em>
            </h2>
            <p style={{ fontSize: 18, lineHeight: 1.55, color: tokens.inkMute, maxWidth: 600 }}>A straightforward process — faster than most agencies can schedule a kickoff call.</p>
          </div>

          <div className="vwx-steps">
            {[
              { num: '01', title: '30-min scoping call with me', body: "Not an SDR. Not a recruiter. You walk me through the role, your stack, and what your team is actually like. I'll tell you on the call whether we have a fit." },
              { num: '02', title: 'I hand-match 3–5 engineers in 48 hours', body: 'I personally review every match before you see it. Each engineer has passed our technical assessment, communication screening, and reference check.' },
              { num: '03', title: '1-week paid trial, then you decide', body: 'Work with the engineer I recommend for one week. Not the right fit? I replace within 48 hours at no extra cost. You only commit beyond the trial if you want to.' },
            ].map((s) => (
              <article key={s.num} className="vwx-step" style={{
                background: tokens.softGray, border: `1px solid ${tokens.paperLine}`, borderRadius: 18,
                padding: '32px 26px 28px',
              }}>
                <div style={{ fontSize: 12, fontWeight: 500, letterSpacing: '0.08em', color: tokens.brandPurple, marginBottom: 20 }}>{s.num}</div>
                <h3 style={{ fontWeight: 600, fontSize: 22, letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: 14, color: tokens.ink }}>{s.title}</h3>
                <p style={{ color: tokens.inkMute, fontSize: 15, lineHeight: 1.55 }}>{s.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ============ SAMPLE PROFILE — brand purple ============ */}
      <section id="sample" className="vwx-section-reveal" style={{ padding: '0 0 88px' }}>
        <div className="vwx-sample-section" style={{
          background: tokens.brandPurple, color: tokens.paper, borderRadius: 28,
          padding: '56px 48px', margin: '0 32px', position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: '-30%', left: '-10%', width: 600, height: 600,
            background: 'radial-gradient(circle, rgba(167, 139, 250, 0.18), transparent 60%)', pointerEvents: 'none',
          }}></div>
          <div className="vwx-sample-grid" style={{ position: 'relative', zIndex: 2 }}>
            <div>
              <span style={{ fontSize: 11.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255, 255, 255, 0.7)', marginBottom: 20, display: 'inline-block', fontWeight: 500 }}>How we vet</span>
              <h2 className="vwx-section-title" style={{ fontWeight: 600, fontSize: 'clamp(34px, 4.5vw, 52px)', lineHeight: 1.05, letterSpacing: '-0.02em', color: tokens.paper, marginBottom: 20 }}>
                This is what <em style={{ fontStyle: 'italic', fontWeight: 500, color: 'rgba(255,255,255,0.85)' }}>pre-vetted</em> actually looks like.
              </h2>
              <p style={{ fontSize: 18, lineHeight: 1.55, color: 'rgba(255, 255, 255, 0.75)', maxWidth: 600 }}>
                "Pre-vetted" is the most overused word in staffing. Here's what it means at ViraWorkX — the actual stages every engineer in the network has cleared before they reach you.
              </p>
            </div>

            <div style={{
              background: tokens.paper, border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: 18,
              padding: 28, boxShadow: '0 18px 50px -15px rgba(0, 0, 0, 0.25)',
            }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 11, letterSpacing: '0.06em',
                textTransform: 'uppercase', color: tokens.brandPurple, padding: '6px 12px',
                border: `1px solid ${tokens.lavenderLine}`, background: tokens.lavender,
                borderRadius: 999, marginBottom: 22, fontWeight: 500,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#16a34a', boxShadow: '0 0 8px rgba(22, 163, 74, 0.5)' }}></span>
                Our 4-stage vetting process
              </div>
              <div style={{ fontWeight: 600, fontSize: 26, letterSpacing: '-0.018em', lineHeight: 1.1, marginBottom: 6, color: tokens.ink }}>What pre-vetted means.</div>
              <div style={{ fontSize: 12, letterSpacing: '0.04em', textTransform: 'uppercase', color: tokens.inkMute, marginBottom: 24 }}>700+ engineers reviewed · 20 in the network</div>

              {[
                { num: '01', text: 'Technical assessment — 90-min live coding plus system design, scored against role-specific rubric.' },
                { num: '02', text: 'Portfolio & code-sample review — real production code, not toy projects or interview prompts.' },
                { num: '03', text: 'Communication screening — written and async-collaboration test, because remote-first work fails on this first.' },
                { num: '04', text: 'Reference checks with two prior managers — verbal, structured, no email forms.' },
              ].map((stage, i, arr) => (
                <div key={stage.num} className="vwx-profile-row" style={{
                  display: 'flex', justifyContent: 'space-between', padding: '14px 0',
                  borderBottom: i < arr.length - 1 ? `1px solid ${tokens.paperLine}` : 'none', fontSize: 14, alignItems: 'flex-start', gap: 16,
                }}>
                  <span style={{ fontSize: 11, letterSpacing: '0.05em', textTransform: 'uppercase', color: tokens.inkMute, fontWeight: 500, paddingTop: 2, flexShrink: 0 }}>{stage.num}</span>
                  <span style={{ color: tokens.ink, fontWeight: 450, textAlign: 'right', maxWidth: 320, lineHeight: 1.45 }}>{stage.text}</span>
                </div>
              ))}

              <div style={{
                marginTop: 22, padding: '16px 18px',
                background: tokens.lavender, border: `1px solid ${tokens.lavenderLine}`,
                borderRadius: 12,
              }}>
                <div style={{
                  display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '12px 16px',
                  alignItems: 'start', fontSize: 13, lineHeight: 1.5,
                }}>
                  <span style={{ fontSize: 11, letterSpacing: '0.05em', textTransform: 'uppercase', color: tokens.brandPurple, fontWeight: 500, paddingTop: 2 }}>Where</span>
                  <span style={{ color: tokens.inkSoft }}>Engineers based in India, working US business hours (4–8 hours overlap with PT).</span>

                  <span style={{ fontSize: 11, letterSpacing: '0.05em', textTransform: 'uppercase', color: tokens.brandPurple, fontWeight: 500, paddingTop: 2 }}>Trust</span>
                  <span style={{ color: tokens.inkSoft }}>Talk to engineers we've already placed — references available on request.</span>

                  <span style={{ fontSize: 11, letterSpacing: '0.05em', textTransform: 'uppercase', color: tokens.brandPurple, fontWeight: 500, paddingTop: 2 }}>Terms</span>
                  <span style={{ color: tokens.inkSoft }}><strong style={{ color: tokens.ink, fontWeight: 600 }}>No lock-in. No minimum commitment.</strong> 1-week paid trial, replace within 48 hrs if it's not the right fit.</span>
                </div>
              </div>

              <div style={{
                marginTop: 20, paddingTop: 20, borderTop: `1px solid ${tokens.paperLine}`,
                display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap',
              }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 19, letterSpacing: '-0.015em', color: tokens.ink, lineHeight: 1.2 }}>Sample profiles on request</div>
                  <div style={{ fontSize: 11, letterSpacing: '0.05em', textTransform: 'uppercase', color: tokens.inkMute, fontWeight: 500, marginTop: 4 }}>After a 30-min scoping call</div>
                </div>
                <a href={CALENDLY_URL} target="_blank" rel="noopener noreferrer" style={{
                  fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase',
                  color: tokens.brandPurple, borderBottom: '1px solid currentColor', paddingBottom: 2, fontWeight: 500,
                }}>Book a call →</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ FOUNDER STORY — brand purple ============ */}
      <section id="founder" className="vwx-founder-bio vwx-section-pad vwx-section-reveal" style={{
        background: tokens.brandPurple, color: tokens.paper, padding: '88px 0', position: 'relative', zIndex: 2,
      }}>
        <div className="vwx-container" style={{ maxWidth: 1280, margin: '0 auto', padding: '0 32px' }}>
          <div className="vwx-founder-block">
            <div className="vwx-founder-portrait" style={{
              position: 'relative', borderRadius: 20, overflow: 'hidden', aspectRatio: '4 / 5',
              maxWidth: 420, boxShadow: '0 30px 60px -30px rgba(0, 0, 0, 0.4)',
            }}>
              <img className="vwx-founder-photo" src={FOUNDER_PHOTO} alt="Rahul Ramachandran, Founder of ViraWorkX" style={{
                width: '100%', height: '100%', objectFit: 'cover', filter: 'contrast(1.02) saturate(0.95)',
              }} />
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(180deg, transparent 60%, rgba(0, 0, 0, 0.3))', pointerEvents: 'none',
              }}></div>
              <div style={{
                position: 'absolute', bottom: 20, left: 20, background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(8px)', padding: '10px 14px', borderRadius: 12,
                fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: tokens.brandPurple, fontWeight: 500,
              }}>Chennai · San Francisco</div>
            </div>

            <div>
              <span style={{ fontSize: 11.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255, 255, 255, 0.7)', marginBottom: 20, display: 'inline-block', fontWeight: 500 }}>Why I'm building this</span>
              <h2 className="vwx-founder-bio-h2" style={{
                fontWeight: 600, fontSize: 'clamp(32px, 4vw, 44px)', lineHeight: 1.08, letterSpacing: '-0.02em',
                marginBottom: 28, color: tokens.paper,
              }}>
                The network{' '}
                <em style={{ fontStyle: 'italic', fontWeight: 500, color: 'rgba(255, 255, 255, 0.85)' }}>I wish existed</em>{' '}
                when I was on either side of the table.
              </h2>

              <p style={{ fontSize: 17, lineHeight: 1.65, color: 'rgba(255, 255, 255, 0.88)', marginBottom: 18 }}>
                I spent 16 years scaling US-India operations — including taking one company from 20 to 2,500 employees. I've watched US founders burn $40K+ a month on average engineers. I've watched brilliant senior engineers get stuck in agency contracts that pay them peanuts.
              </p>
              <p style={{ fontSize: 17, lineHeight: 1.65, color: 'rgba(255, 255, 255, 0.88)', marginBottom: 18 }}>
                ViraWorkX is the network I wish existed when I was on either side of that table. Senior engineers, paid fairly. Founders matched fast, billed honestly. No agency middlemen, no 6-week sourcing cycles, no résumé walls.
              </p>
              <p style={{ fontSize: 17, lineHeight: 1.65, color: 'rgba(255, 255, 255, 0.88)', marginBottom: 18 }}>
                If you're a founder hiring, you talk to me. Not an SDR, not a recruiter. Me.
              </p>

              <div style={{
                marginTop: 32, display: 'flex', alignItems: 'center', gap: 14,
                paddingTop: 24, borderTop: '1px solid rgba(255, 255, 255, 0.18)',
              }}>
                <div>
                  <div style={{ fontStyle: 'italic', fontWeight: 500, fontSize: 22, letterSpacing: '-0.01em', color: tokens.paper }}>Rahul Ramachandran</div>
                  <div style={{ fontSize: 11.5, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(255, 255, 255, 0.65)', fontWeight: 500 }}>Founder · ViraWorkX, Inc. · Texas</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ ROLES ============ */}
      <section className="vwx-section-pad vwx-section-reveal" style={{ padding: '88px 0' }}>
        <div className="vwx-container" style={{ maxWidth: 1280, margin: '0 auto', padding: '0 32px' }}>
          <div className="vwx-section-header" style={{ maxWidth: 760, marginBottom: 48 }}>
            <span style={{ fontSize: 11.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: tokens.brandPurple, marginBottom: 20, display: 'inline-block', fontWeight: 500 }}>Roles we place</span>
            <h2 className="vwx-section-title" style={{ fontWeight: 600, fontSize: 'clamp(34px, 4.5vw, 52px)', lineHeight: 1.05, letterSpacing: '-0.02em', color: tokens.ink, marginBottom: 20 }}>
              Senior to staff engineers <Em>across the modern stack.</Em>
            </h2>
            <p style={{ fontSize: 18, lineHeight: 1.55, color: tokens.inkMute, maxWidth: 600 }}>All placements include a 1-week paid trial. Senior engineers at 30–50% below US market rate.</p>
          </div>

          <div className="vwx-roles-grid">
            {[
              { num: '01', title: 'Full-Stack Engineers', stack: 'React · Node.js · TypeScript · Python', meta: 'Senior to Staff · 5–10 yrs' },
              { num: '02', title: 'Backend Engineers', stack: 'Go · Java · Python · Node.js · Postgres', meta: 'Mid to Staff · 4–10 yrs' },
              { num: '03', title: 'Frontend Engineers', stack: 'React · Vue · Next.js · Tailwind', meta: 'Senior to Staff · 5–9 yrs' },
              { num: '04', title: 'ML / AI Engineers', stack: 'PyTorch · LangChain · LLMs · RAG', meta: 'Senior to Staff · 4–8 yrs' },
              { num: '05', title: 'App Developers', stack: 'React Native · Flutter · Swift · Kotlin', meta: 'Senior to Staff · 5–9 yrs' },
              { num: '06', title: 'DevOps / SRE', stack: 'AWS · Kubernetes · Terraform · CI/CD', meta: 'Senior to Staff · 5–9 yrs' },
            ].map((role) => (
              <article key={role.num} className="vwx-role" style={{ background: tokens.paper, padding: '32px 28px' }}>
                <div style={{ fontSize: 11, letterSpacing: '0.08em', color: tokens.brandPurple, marginBottom: 16, fontWeight: 600 }}>{role.num}</div>
                <h3 style={{ fontWeight: 700, fontSize: 20, letterSpacing: '-0.018em', marginBottom: 10, color: tokens.ink }}>{role.title}</h3>
                <p style={{ fontSize: 12.5, color: tokens.ink, lineHeight: 1.6, marginBottom: 16, fontWeight: 600 }}>{role.stack}</p>
                <div style={{ fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: tokens.inkSoft, fontWeight: 600 }}>{role.meta}</div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ============ CALCULATOR — brand purple ============ */}
      <CalculatorSection />

      {/* ============ FAQ ============ */}
      <section id="faq" className="vwx-section-pad vwx-section-reveal" style={{ background: tokens.softGray, borderTop: `1px solid ${tokens.paperLine}`, padding: '88px 0' }}>
        <div className="vwx-container" style={{ maxWidth: 1280, margin: '0 auto', padding: '0 32px' }}>
          <div className="vwx-section-header" style={{ maxWidth: 760, marginBottom: 48, textAlign: 'center', marginLeft: 'auto', marginRight: 'auto' }}>
            <span style={{ fontSize: 11.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: tokens.brandPurple, marginBottom: 20, display: 'inline-block', fontWeight: 500 }}>Frequently asked</span>
            <h2 className="vwx-section-title" style={{ fontWeight: 600, fontSize: 'clamp(34px, 4.5vw, 52px)', lineHeight: 1.05, letterSpacing: '-0.02em', color: tokens.ink, marginBottom: 20 }}>
              Honest answers to <Em>the questions you'd ask anyway.</Em>
            </h2>
          </div>

          <div style={{ maxWidth: 880, margin: '0 auto' }}>
            {[
              { open: true, q: 'How quickly can I actually hire an engineer?', a: 'First match in 48 hours. Engineer onboarded and shipping within 5–7 business days, including a 1-week paid trial. Most founders we talk to have their first engineer in pull requests within two weeks of the kickoff call.' },
              { open: true, q: 'How does the 1-week paid trial work?', a: "You pay the engineer's standard rate for one week of real work — a defined deliverable, not interview prompts. If the fit isn't there at the end of the week, we replace within 48 hours at no additional cost. You only commit beyond the trial if you want to." },
              { open: false, q: "What if it's still not the right fit after the replacement?", a: "We replace as many times as it takes within the first 30 days. If after two replacements we still haven't found the right engineer for your role, we'll refund the engagement. We'd rather lose the deal than place someone you don't trust." },
              { open: false, q: 'How do you actually vet engineers?', a: "Multi-stage: technical assessment (live coding + system design), portfolio and code-sample review, communication and async-collaboration screening, reference checks with two prior managers. We've vetted 700+ engineers and onboarded 20+ to the network. The bar is intentionally high." },
              { open: false, q: 'Do you handle contracts and compliance?', a: 'Yes. Employment contracts, IP assignment agreements, NDAs, background checks, and engagement compliance — all handled by our team. You get a clean, US-jurisdiction MSA. The engineer gets paid through our platform on time, every time.' },
              { open: false, q: 'Why work with you instead of a bigger staffing platform?', a: 'Three reasons. First, you talk to me, the founder, not an SDR. Every first call goes through me personally. Second, we focus narrowly on senior engineers for early-stage startups — not enterprise — which means faster matches, better culture fit, and a much smaller candidate pool to choose from. Third, honest economics: published rate bands, no opaque margin stack, no minimum commitments. The bigger platforms can\'t do any of those three. That\'s the whole pitch.' },
            ].map((item, idx) => (
              <details key={idx} className="vwx-faq" open={item.open} style={{ borderBottom: `1px solid ${tokens.paperLine}`, padding: '28px 0' }}>
                <summary className="vwx-faq-summary" style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 24,
                  fontWeight: 600, fontSize: 20, letterSpacing: '-0.015em', color: tokens.ink,
                }}>
                  {item.q}
                  <span className="vwx-faq-icon" style={{
                    flexShrink: 0, width: 28, height: 28, border: `1px solid ${tokens.ink}`,
                    borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, color: tokens.ink,
                  }}>+</span>
                </summary>
                <p style={{ marginTop: 18, color: tokens.inkMute, fontSize: 16, lineHeight: 1.65, maxWidth: 720 }}>{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ============ CTA — brand purple ============ */}
      <section style={{ padding: '56px 0' }}>
        <div className="vwx-cta-section" style={{
          background: tokens.brandPurple, color: tokens.paper, borderRadius: 28, padding: '64px 48px',
          margin: '0 32px', textAlign: 'center', position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(circle at 20% 30%, rgba(167, 139, 250, 0.2), transparent 50%), radial-gradient(circle at 80% 70%, rgba(167, 139, 250, 0.15), transparent 50%)',
            pointerEvents: 'none',
          }}></div>
          <h2 style={{
            fontWeight: 600, fontSize: 'clamp(36px, 5vw, 56px)', lineHeight: 1.05, letterSpacing: '-0.02em',
            marginBottom: 18, maxWidth: 800, marginLeft: 'auto', marginRight: 'auto', color: tokens.paper,
            position: 'relative', zIndex: 2,
          }}>
            Ready to <em style={{ fontStyle: 'italic', fontWeight: 500, color: 'rgba(255, 255, 255, 0.85)' }}>meet your next engineer?</em>
          </h2>
          <p style={{ fontSize: 17, color: 'rgba(255, 255, 255, 0.8)', maxWidth: 540, margin: '0 auto 28px', lineHeight: 1.55, position: 'relative', zIndex: 2 }}>
            Book a 30-minute call. We'll scope your role, confirm fit, and send your first introductions within 48 hours.
          </p>
          <a href={CALENDLY_URL} target="_blank" rel="noopener noreferrer" className="vwx-cta-light" style={{
            display: 'inline-flex', alignItems: 'center', gap: 10, background: tokens.paper, color: tokens.brandPurple,
            padding: '16px 26px', borderRadius: 999, fontSize: 15, fontWeight: 600, position: 'relative', zIndex: 2,
          }}>
            Book a 30-min call with Rahul
            <ArrowUpRight />
          </a>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer style={{ padding: '48px 0 32px', borderTop: `1px solid ${tokens.paperLine}`, marginTop: 56 }}>
        <div className="vwx-container" style={{ maxWidth: 1280, margin: '0 auto', padding: '0 32px' }}>
          <div className="vwx-footer-grid">
            <div>
              <a href="/" style={{ display: 'inline-block', marginBottom: 20 }}>
                <img src={LOGO_FULL} alt="ViraWorkX" style={{ height: 56, maxWidth: 200, objectFit: 'contain', objectPosition: 'left' }} />
              </a>
              <p style={{ fontSize: 14, color: tokens.inkMute, lineHeight: 1.6, maxWidth: 320 }}>Pairing US founders with pre-vetted senior engineers. 48-hour matching. 1-week paid trial. Guaranteed replacement.</p>
            </div>
            {[
              { title: 'Platform', links: [
                { href: '#how', label: 'How It Works' },
                { href: '#sample', label: 'Vetting Process' },
                { href: '#founder', label: 'Why Us' },
                { href: '#faq', label: 'FAQ' },
              ]},
              { title: 'For Talent', links: [
                { href: '/talent', label: 'Apply to Network' },
                { href: 'https://app.viraworkx.ai', label: 'Sign In' },
              ]},
              { title: 'Company', links: [
                { href: CALENDLY_URL, label: 'Book a Call', external: true },
                { href: 'mailto:rahul@viraworkx.ai', label: 'rahul@viraworkx.ai' },
              ]},
            ].map((col) => (
              <div key={col.title}>
                <h4 style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: tokens.inkMute, marginBottom: 16 }}>{col.title}</h4>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {col.links.map((link) => (
                    <li key={link.label} style={{ marginBottom: 10 }}>
                      <a className="vwx-footer-link" href={link.href} target={link.external ? '_blank' : undefined} rel={link.external ? 'noopener noreferrer' : undefined} style={{ color: tokens.inkSoft, fontSize: 14.5 }}>{link.label}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="vwx-footer-bottom" style={{
            paddingTop: 32, borderTop: `1px solid ${tokens.paperLine}`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            fontSize: 11.5, color: tokens.inkMute, letterSpacing: '0.04em', flexWrap: 'wrap', gap: 12, fontWeight: 500,
          }}>
            <span>© ViraWorkX, Inc. · Headquartered in Texas · Team in San Francisco &amp; Chennai</span>
            <span>Beta · Onboarding our first cohort of founders</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
