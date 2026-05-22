import { Book, GitBranch, Plus } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { openUrl } from '@tauri-apps/plugin-opener'
import { useElementSize, type AppInfo } from "openchad-react"

const TICKS = 60

const isTauri = typeof window !== "undefined" && !!(window as any).__TAURI__;

export default function App(appInfo: AppInfo) {
  const { useTool, useTabDatabase } = appInfo
  const [counter] = useTabDatabase("counter", { initialValue: { currentValue: 0 } })
  const tool = useTool()
  const svgRef = useRef<SVGSVGElement>(null)
  const numRef = useRef<HTMLSpanElement>(null)
  const [mounted, setMounted] = useState(false)
  const [containerRef, { width }] = useElementSize<HTMLDivElement>()
  
  useEffect(() => { 
    setMounted(true)
  }, [])
  
  useEffect(() => {
    buildDial(counter.currentValue)
  }, [counter.currentValue, width])

  function buildDial(active: number) {
    const svg = svgRef.current
    if (!svg) return
    svg.innerHTML = ''
    // Scale dial based on container width if it's small
    const scale = width > 0 && width < 500 ? 0.75 : 1
    const R = 104 * scale
    const CX = 110 * scale
    const CY = 110 * scale
    // Update viewBox to match new size
    const viewBoxSize = 240 * scale
    const offset = -10 * scale
    svg.setAttribute('viewBox', `${offset} ${offset} ${viewBoxSize} ${viewBoxSize}`)
    for (let i = 0; i < TICKS; i++) {
      const angle = (i / TICKS) * 2 * Math.PI - Math.PI / 2
      const isMajor = i % 5 === 0
      const inner = isMajor ? R - (10 * scale) : R - (6 * scale)
      const x1 = CX + Math.cos(angle) * inner, y1 = CY + Math.sin(angle) * inner
      const x2 = CX + Math.cos(angle) * R, y2 = CY + Math.sin(angle) * R
      const lit = active > 0 && (i / TICKS) < ((active % TICKS) / TICKS)
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
      line.setAttribute('x1', String(x1)); line.setAttribute('y1', String(y1))
      line.setAttribute('x2', String(x2)); line.setAttribute('y2', String(y2))
      line.setAttribute('stroke', 'currentColor')
      line.setAttribute('stroke-width', isMajor ? String(2 * scale) : String(1 * scale))
      line.setAttribute('stroke-linecap', 'round')
      line.setAttribute('opacity', lit ? (isMajor ? '0.85' : '0.55') : (isMajor ? '0.12' : '0.07'))
      svg.appendChild(line)
    }
  }
  
  const isMobile = width > 0 && width < 640;
  const scale = width > 0 && width < 500 ? 0.75 : 1;
  const dialSize = 220 * scale;

  return (
    <div ref={containerRef} className="flex flex-col items-center justify-center w-full min-h-full gap-0 py-12 px-4 bg-radial from-neutral-800/15 dark:from-neutral-400/15 from-0% to-transparent">
      <style>{`
        .oc-root {
          font-family: 'DM Sans', sans-serif;
          --oc-accent: #00e5a0;
          --oc-accent2: #7c6fef;
          --oc-dim: rgba(150,150,160,0.55);
          --oc-card-bg: rgba(255,255,255,0.035);
          --oc-card-border: rgba(255,255,255,0.085);
        }
        .oc-logo-mark {
          width: 52px; height: 52px;
          border: 1.5px solid rgba(255,255,255,0.2);
          border-radius: 14px;
          display: flex; align-items: center; justify-content: center;
          background: rgba(255,255,255,0.04);
          position: relative;
          overflow: hidden;
          transition: border-color 0.3s;
        }
        .oc-logo-mark::before {
          content: '';
          position: absolute; inset: 0;
          background: linear-gradient(135deg, rgba(0,229,160,0.15) 0%, rgba(124,111,239,0.15) 100%);
        }
        .oc-wordmark {
          font-size: 20px;
          font-weight: 700;
          letter-spacing: -0.03em;
        }
        .oc-tagline {
          font-size: 12px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }
        .oc-divider {
          width: 1px; height: 28px;
          background: rgba(255,255,255,0.1);
        }
        .oc-cards {
          display: flex;
          gap: 12px;
          width: 100%;
          max-width: 700px;
        }
        .oc-card {
          border: 0.5px solid hsl(var(--border));
          border-radius: 12px;
          padding: 18px 20px;
          cursor: pointer;
          transition: border-color 0.2s, background 0.2s, transform 0.15s;
          text-decoration: none;
          display: flex;
          flex-direction: column;
          gap: 6px;
          color: inherit;
        }
        .oc-card-icon-dot {
          width: 7px; height: 7px; border-radius: 50%;
          display: inline-block;
          flex-shrink: 0;
          margin-bottom: 6px;
        }
        .oc-card-title {
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.02em;
          display: flex; align-items: center; gap: 5px;
        }
        .oc-card-title .oc-arrow {
          opacity: 0;
          transition: opacity 0.15s, transform 0.15s;
          transform: translateX(-3px);
          font-size: 13px;
        }
        .oc-card:hover .oc-arrow { opacity: 0.6; transform: translateX(0); }
        .oc-card-desc {
          font-size: 12px;
          font-family: 'DM Sans', sans-serif;
        }
        .oc-edit-hint {
          font-size: 11px;
          color: rgba(255,255,255,0.22);
          letter-spacing: 0.04em;
          text-align: center;
        }
        .oc-edit-hint code {
          color: rgba(0,229,160,0.5);
          font-size: 11px;
        }
        .g-num { transition: transform 0.18s cubic-bezier(0.34,1.56,0.64,1); user-select: none; }
        .g-num.bump { transform: scale(1.1); }
        .g-btn:hover { background: rgba(128,128,128,0.08) !important; }
        .g-btn:active { transform: scale(0.97) !important; }
        .oc-fade-in { animation: ocFadeUp 0.5s ease both; }
        .oc-delay-1 { animation-delay: 0.05s; }
        .oc-delay-2 { animation-delay: 0.15s; }
        .oc-delay-3 { animation-delay: 0.27s; }
        .oc-delay-4 { animation-delay: 0.38s; }
        .oc-delay-5 { animation-delay: 0.46s; }
        @keyframes ocFadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        .oc-pip {
          font-size: 10px;
          padding: 2px 10px;
          border-radius: 20px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          background: rgba(0,229,160,0.08);
          color: rgba(0,229,160,0.65);
          border: 0.5px solid rgba(0,229,160,0.2);
        }
      `}</style>
      <div
        className="oc-root flex flex-col items-center gap-8 w-full"
        style={{ opacity: mounted ? 1 : 0, transition: 'opacity 0.25s' }}
      >
        {/*  Branding  */}
        <div className="oc-fade-in oc-delay-1 flex flex-col items-center gap-3">
          <div className="flex items-center gap-3">
            <div>
              <svg
                className="w-5 h-5 stroke-[15px] stroke-accent"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 657 657"
              >
                <path fill="currentColor" d="M173 84h6a167 167 0 0 1 80 34l3 2a428 428 0 0 0 21 15l4 4 2 1a462 462 0 0 0 17 14c8 8 17 15 24 24l14 15 6 6 2 2c3 3 3 3 3 6l-8 7-3 3-2 1-8 6-4 1c-4-1-5-3-8-6a2267 2267 0 0 0-4-5l-9-9-10-11-21-21c-3-1-5-4-7-6-17-14-17-14-36-26-3 0-5 2-7 4l-2 2-2 2-2 2a968 968 0 0 0-17 19l-2 2a4081 4081 0 0 0-25 34l8 6 3 2a257 257 0 0 1 27 22 208 208 0 0 1 31 31 296 296 0 0 1 32 39 359 359 0 0 1 26 40 393 393 0 0 1 64 185c3 31-3 67-23 92a71 71 0 0 1-51 24 153 153 0 0 1-50-8l-6-2-1-3a1041 1041 0 0 1 9 1l8 1a65 65 0 0 0 51-13l4-1 1-2c1-4 3-6 6-9 5-6 8-13 10-21l2-5c20-49-4-118-23-164a332 332 0 0 0-16-32c-5-11-12-22-18-32l-2-2a356 356 0 0 0-50-67l-2 2-7 7c-12 11-12 11-22 23l-8 10-18 21 6 8 11 13 2 3a1365 1365 0 0 1 7 10c35 49 64 114 55 175-2 16-9 31-22 40l-5 3-2 2c-14 7-31 4-45 0a156 156 0 0 1-54-33 215 215 0 0 1-30-29 291 291 0 0 1-51-79c-14-29-25-61-26-93v-4c-1-22 2-44 17-60 10-10 21-14 35-14 29 0 54 16 75 34l5 4 7 6a82 82 0 0 0 14-18l2-2c10-15 21-29 33-41l4-8-24-20-2-2-19-13-3-2-19-10-2-1c-24-11-49-16-74-8-16 6-27 18-34 34l-8 24-2-1a121 121 0 0 1 26-69c4-6 8-10 15-13l2-2c7-4 13-6 20-7l3-1a105 105 0 0 1 67 13l3 1h7l3-4 2-3 2-2 3-3 10-14c10-14 21-26 33-38-11-11-36-16-52-18l-2-1c-9-1-18-1-27 1h-4c-13 2-22 8-33 15l-6 2 7-11 3-4 2-1 3-4a78 78 0 0 1 72-22ZM31 339c-8 11-12 23-12 37v3c-1 51 23 100 52 139l2 3c15 20 33 37 53 51l3 2c15 10 34 16 53 13 10-2 17-7 23-16 6-10 9-20 9-32v-3c1-58-29-114-66-156l-2-3-28-26-2-2c-22-17-62-36-85-10Z" />
                <path fill="currentColor" d="m344 57 7 5a199 199 0 0 1 35 27l12 10a134 134 0 0 1 24 22l6 7 18 20 13-5c14-7 28-13 43-17l3-2 16-2 4 5a2136 2136 0 0 0 38 54l8 14a267 267 0 0 1 22 42c21 43 35 90 37 138v20a124 124 0 0 1-9 43c-3 12-9 23-15 34l-2-1 4-13a116 116 0 0 0 7-37 373 373 0 0 0-59-212l-2-3a476970923 476970923 0 0 0-12-21l-24-33c-8 2-15 5-22 9l-3 1-26 13 10 14 17 25 11 19a362 362 0 0 1 29 55l1 2c25 54 44 114 42 174v4c-1 18-3 34-9 51v3c-3 9-7 17-14 24l-6 9c-7 9-17 16-27 22 0-4 0-5 3-8l2-3 2-2c18-24 23-50 24-79v-24c-1-22-5-43-10-65v-3l-15-45-1 1a378 378 0 0 1-58 34l-3 2-5 3 2 4c11 30 19 63 22 95v2c3 36 3 83-21 113l-5 5-4 6c-4 5-9 9-15 12l-2 1c-12 8-25 12-39 12v-3l5-3c12-7 22-14 30-26l2-4c5-7 8-14 10-21l1-2c3-10 5-19 6-30l1-7a356 356 0 0 0-54-210 248 248 0 0 0-27-45l-3-5-2-4-2-2-1-7 4-3 2-1 3-2 5-3 3-2 8-5c4 2 5 4 8 8l2 3a236496 236496 0 0 1 16 27l1 2 4 7a136 136 0 0 1 12 22l1 4a1318 1318 0 0 0 11 21l2 4 1 3 1 4a8549 8549 0 0 0 60-35l2-2 2-1 4-1a272 272 0 0 0-15-33l-1-3a404 404 0 0 0-31-53c-7-12-15-24-24-35l-9-13a335 335 0 0 0-43-49 242 242 0 0 0-37-34c-6-5-12-11-19-15l-2-1a981 981 0 0 0-53-30h-2c-9-4-18-7-28-8l-9-2c-16-3-31 0-46 3l-1-3c12-7 24-12 37-14l3-1c37-6 77 9 108 29ZM88 421c23 16 39 41 45 68 2 10 3 21-2 31-3 5-7 7-13 8-12 1-21-4-30-12l-2-2c-19-15-33-41-36-65-1-9-1-17 4-25l2-3c9-8 22-5 32 0Z" />
                <path fill="currentColor" d="m459 47 10 4 2 1 5 4 2 1a703 703 0 0 1 58 40l19 19 4 5c8 8 15 17 21 26l2 2c20 29 36 61 46 95l1 3c9 31 9 64 11 95h-3v-3a344 344 0 0 0-54-161l-2-3a2024 2024 0 0 0-7-12l-21-29-5-5a210 210 0 0 0-25-29 146 146 0 0 0-24-23c-9-8-18-14-28-20l-12-8v-2Z" />
                <path fill="currentColor" d="M329 16a182 182 0 0 1 119 38c6 3 11 8 16 13l11 9 12 10-1 3c-15 5-15 5-21 2-4-2-7-6-10-9l-9-8-8-7c-9-8-20-14-30-20l-6-4c-7-5-15-8-23-12h-2c-14-6-28-9-43-11l-6-1 1-3Z" />
              </svg>
            </div>
            <div className="oc-divider" />
            <div className="flex flex-col gap-0.5">
              <div className="font-bold font-funnel" style={{ fontSize: isMobile ? 18 : 20 }}>
                <span>Open</span><span>Chad</span>
              </div>
              <div className="oc-tagline text-accent/50" style={{ fontSize: isMobile ? 10 : 12 }}>Build your own AI-driven App (ADA)</div>
            </div>
          </div>
        </div>
        {/*  Counter dial  */}
        <div className="oc-fade-in oc-delay-2 flex flex-col items-center gap-6">
          <div style={{ position: 'relative', width: dialSize, height: dialSize }}>
            <svg
              ref={svgRef}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}
            />
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
              <span
                ref={numRef}
                className="g-num"
                style={{
                  fontSize: 64 * scale,
                  fontFamily: "'Space Mono', monospace",
                  fontWeight: 700,
                  lineHeight: 1,
                  letterSpacing: '-0.04em',
                }}
              >
                {counter.currentValue}
              </span>
              <span style={{ fontSize: 11 * scale, fontFamily: "'Space Mono', monospace", letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(150,150,160,0.55)' }}>
                count
              </span>
            </div>
          </div>
          <button
            className="g-btn border border-accent/50"
            style={{
              fontSize: 12,
              fontFamily: "'Space Mono', monospace",
              fontWeight: 700,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              background: 'transparent',
              borderRadius: 6,
              padding: isMobile ? '10px 30px' : '12px 40px',
              cursor: 'pointer',
              transition: 'background 0.1s, transform 0.08s',
              display: 'flex',
              alignItems: 'center',
              gap: 9,
              color: 'inherit',
            }}
            onClick={async () => {
              numRef.current?.classList.remove('bump')
              void numRef.current?.offsetWidth
              numRef.current?.classList.add('bump')
              setTimeout(() => numRef.current?.classList.remove('bump'), 300)
              // console.log(await pyInvoke("tools"))
              console.log(await tool("counter", { model: "litellm/openrouter/openrouter/free", action: "increment", value: 1 } as Record<string, any>))
            }}
          >
            <Plus className="w-3.5 h-3.5" />
            increment
          </button>
        </div>
        {/*  Feature cards  */}
        <div className={`oc-fade-in oc-delay-3 oc-cards ${isMobile ? 'flex-col' : ''}`}>
          <button
            className="flex-1 bg-accent/5 hover:bg-radial hover:from-accent/5 dark:hover:from-accent/25 hover:from-0% hover:to-accent/15 dark:hover:to-accent/5 hover:border-accent oc-card"
            onClick={
              (e) => {
                e.preventDefault();
                if (isTauri) {
                  openUrl('https://openchad.github.io/docs/customization/custom-app.html')
                } else {
                  window.open('https://openchad.github.io/docs/customization/custom-app.html', '_blank')
                }
              }
            }
          >
            <div className='flex items-center justify-center gap-2'>
              <div>
                <Book/>
              </div>
              <div>
                <div className="text-left text-accent oc-card-title">Documentation <span className="oc-arrow">→</span></div>
                <div className="text-left text-accent/50 oc-card-desc">Learn how to build custom tool, app, etc.</div>
              </div>
            </div>
          </button>
          <button
            className="flex-1 bg-accent/5 hover:bg-radial hover:from-accent/5 dark:hover:from-accent/25 hover:from-0% hover:to-accent/15 dark:hover:to-accent/5 hover:border-accent oc-card"
            onClick={
              (e) => {
                e.preventDefault();
                if (isTauri) {
                  openUrl('https://discord.gg/JWeqhecqBD')
                } else {
                  window.open('https://discord.gg/JWeqhecqBD', '_blank')
                }
              }
            }
          >
            <div className='flex items-center justify-center gap-2'>
              <div>
                <svg className="cursor-pointer rounded-full w-8 h-8 flex items-center overflow-hidden relative" width="64px" height="64px" viewBox="0 -28.5 256 256" version="1.1" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid" fill="#000000">
                  <g id="SVGRepo_bgCarrier" />
                  <g id="SVGRepo_tracerCarrier" />
                  <g id="SVGRepo_iconCarrier"> <g> <path d="M216.856339,16.5966031 C200.285002,8.84328665 182.566144,3.2084988 164.041564,0 C161.766523,4.11318106 159.108624,9.64549908 157.276099,14.0464379 C137.583995,11.0849896 118.072967,11.0849896 98.7430163,14.0464379 C96.9108417,9.64549908 94.1925838,4.11318106 91.8971895,0 C73.3526068,3.2084988 55.6133949,8.86399117 39.0420583,16.6376612 C5.61752293,67.146514 -3.4433191,116.400813 1.08711069,164.955721 C23.2560196,181.510915 44.7403634,191.567697 65.8621325,198.148576 C71.0772151,190.971126 75.7283628,183.341335 79.7352139,175.300261 C72.104019,172.400575 64.7949724,168.822202 57.8887866,164.667963 C59.7209612,163.310589 61.5131304,161.891452 63.2445898,160.431257 C105.36741,180.133187 151.134928,180.133187 192.754523,160.431257 C194.506336,161.891452 196.298154,163.310589 198.110326,164.667963 C191.183787,168.842556 183.854737,172.420929 176.223542,175.320965 C180.230393,183.341335 184.861538,190.991831 190.096624,198.16893 C211.238746,191.588051 232.743023,181.531619 254.911949,164.955721 C260.227747,108.668201 245.831087,59.8662432 216.856339,16.5966031 Z M85.4738752,135.09489 C72.8290281,135.09489 62.4592217,123.290155 62.4592217,108.914901 C62.4592217,94.5396472 72.607595,82.7145587 85.4738752,82.7145587 C98.3405064,82.7145587 108.709962,94.5189427 108.488529,108.914901 C108.508531,123.290155 98.3405064,135.09489 85.4738752,135.09489 Z M170.525237,135.09489 C157.88039,135.09489 147.510584,123.290155 147.510584,108.914901 C147.510584,94.5396472 157.658606,82.7145587 170.525237,82.7145587 C183.391518,82.7145587 193.761324,94.5189427 193.539891,108.914901 C193.539891,123.290155 183.391518,135.09489 170.525237,135.09489 Z" fill="currentColor" fillRule="nonzero"> </path> </g> </g>
                </svg>
              </div>
              <div>
                <div className="text-left text-accent oc-card-title">Connect with us <span className="oc-arrow">→</span></div>
                <div className="text-left text-accent/50 oc-card-desc">Join our Discord community.</div>
              </div>
            </div>
          </button>
          <button
            className="flex-1 bg-accent/5 hover:bg-radial hover:from-accent/5 dark:hover:from-accent/25 hover:from-0% hover:to-accent/15 dark:hover:to-accent/5 hover:border-accent oc-card"
            onClick={
              (e) => {
                e.preventDefault();
                if (isTauri) {
                  openUrl('https://github.com/openchad/openchad')
                } else {
                  window.open('https://github.com/openchad/openchad', '_blank')
                }
              }
            }
          >
            <div className='flex items-center justify-center gap-2'>
              <div>
                <GitBranch />
              </div>
              <div>
                <div className="text-left text-accent oc-card-title">View Repository <span className="oc-arrow">→</span></div>
                <div className="text-left text-accent/50 oc-card-desc">Build from source, modify to meet your use cases.</div>
              </div>
            </div>
          </button>
        </div>
        {/*  Edit hint  */}
        <div className="oc-fade-in oc-delay-4">
          Edit <code className='rounded-lg bg-neutral-400/5 p-2 text-xs'>src/App.tsx</code> and save to reload.
        </div>
      </div >
    </div >
  )
}