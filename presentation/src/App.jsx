import { useEffect, useState } from 'react'
import { Deck, Fragment, Slide, useReveal } from '@revealjs/react'
import katex from 'katex'
import 'reveal.js/reveal.css'
import 'katex/dist/katex.min.css'
import hnswFigure from './assets/report/hnsw-graph.png'
import ragFigure from './assets/report/rag-pipeline.png'
import './App.css'

const revealConfig = Object.freeze({
  width: 1280,
  height: 720,
  margin: 0.04,
  controls: true,
  progress: true,
  slideNumber: 'c/t',
  hash: true,
  keyboard: true,
  touch: true,
  center: false,
  transition: 'slide',
  scrollActivationWidth: 0,
})

const RAG_SLIDE_INDEX = 6

const cosineFormulaMarkup = Object.freeze({
  __html: katex.renderToString(
    String.raw`\cos(q,d)=\frac{\mathbf{q}\cdot\mathbf{d}}{\lVert\mathbf{q}\rVert_2\,\lVert\mathbf{d}\rVert_2}`,
    {
      displayMode: true,
      throwOnError: false,
    },
  ),
})

const problemPoints = Object.freeze([
  {
    title: 'Long documents',
    detail: 'Legal PDFs are dense, formal, and slow to inspect manually.',
    icon: 'document',
  },
  {
    title: 'Hallucination risk',
    detail: 'General LLMs can invent clauses or legal references.',
    icon: 'warning',
  },
  {
    title: 'Weak trust signals',
    detail: 'Answers without exact sources are hard to verify.',
    icon: 'shield',
  },
  {
    title: 'Document specificity',
    detail: 'Users need answers from the PDF they uploaded.',
    icon: 'target',
  },
])

const objectives = Object.freeze([
  'Document-grounded question answering',
  'Exact PDF citation highlighting',
  'Clause extraction, suggested questions, and document analysis',
  'Real-world application of CSIT algorithms',
])

const processSteps = Object.freeze([
  { label: 'Upload PDF', icon: 'upload' },
  { label: 'Retrieve evidence', icon: 'retrieve' },
  { label: 'Generate answer', icon: 'generate' },
  { label: 'Highlight source', icon: 'highlight' },
])

const ragSteps = Object.freeze([
  {
    label: 'Parse',
    title: 'PDF text becomes page-aware chunks',
    detail: 'The ingestion agent extracts page text, keeps offsets, and preserves source location.',
  },
  {
    label: 'Embed',
    title: 'Chunks enter a shared vector space',
    detail: 'gemini-embedding-001 converts text into 3072-dimensional vectors stored in pgvector.',
  },
  {
    label: 'Retrieve',
    title: 'Similarity search finds the strongest evidence',
    detail: 'The query embedding is ranked against document chunks with cosine distance and HNSW.',
  },
  {
    label: 'Generate',
    title: 'Gemini answers only from retrieved context',
    detail: 'Contextual compression keeps the prompt focused before Gemini 2.5 Flash generates.',
  },
  {
    label: 'Cite',
    title: 'Citations are re-anchored to PDF text',
    detail: 'The UI scrolls to the cited page and highlights the exact matching source passage.',
  },
])

const LAST_RAG_STEP_INDEX = ragSteps.length - 1

const stackGroups = Object.freeze([
  {
    group: 'Frontend',
    icon: 'frontend',
    items: ['React 19', 'Vite', 'Tailwind', 'react-pdf/pdfjs'],
  },
  {
    group: 'Backend',
    icon: 'backend',
    items: ['Express 5', 'TypeScript', 'Agent modules'],
  },
  {
    group: 'Data',
    icon: 'data',
    items: ['PostgreSQL', 'pgvector', 'Drizzle ORM'],
  },
  {
    group: 'AI',
    icon: 'ai',
    items: ['Gemini 2.5 Flash', 'gemini-embedding-001'],
  },
  {
    group: 'Security',
    icon: 'security',
    items: ['PBKDF2', 'HMAC', 'User isolation'],
  },
])

const verificationItems = Object.freeze([
  'Upload and ingestion passed',
  'Answerable questions return grounded answers',
  'Unanswerable questions are refused',
  'Citation clicks scroll and highlight',
  'User isolation works',
])

const presentationModules = Object.freeze([
  'PDF Viewer',
  'Chat Interface',
  'Clause Sidebar',
  'Analysis Panel',
  'Suggestion Chips',
])

const agentModules = Object.freeze([
  'Ingestion Agent',
  'RAG Agent',
  'Clause Agent',
  'Suggestion Agent',
  'Analysis Agent',
])

const userFlowSteps = Object.freeze([
  {
    title: 'Authenticate',
    detail: 'Bearer token scopes the workspace',
    icon: 'auth',
  },
  {
    title: 'Upload PDF',
    detail: 'Pages become source-aware text',
    icon: 'upload',
  },
  {
    title: 'Ask',
    detail: 'Question becomes an embedding',
    icon: 'question',
  },
  {
    title: 'Answer',
    detail: 'Gemini uses retrieved evidence',
    icon: 'answer',
  },
  {
    title: 'Inspect',
    detail: 'Citation scrolls to highlighted text',
    icon: 'highlight',
  },
])

function JumpButton({ target, children, tone = 'primary' }) {
  const deck = useReveal()

  return (
    <button
      type="button"
      className={`jump-button jump-button-${tone}`}
      onClick={() => deck?.slide(target)}
    >
      <span>{children}</span>
      <span aria-hidden="true">-&gt;</span>
    </button>
  )
}

function SectionHeader({ eyebrow, title, lead }) {
  return (
    <header className="section-header">
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      {lead ? <p className="lead">{lead}</p> : null}
    </header>
  )
}

function StatusIcon() {
  return (
    <svg className="status-icon" aria-hidden="true" viewBox="0 0 64 64">
      <circle cx="32" cy="32" r="22" />
      <path d="M21 33l8 8 15-18" />
    </svg>
  )
}

function ProblemIcon({ type }) {
  if (type === 'document') {
    return (
      <svg aria-hidden="true" viewBox="0 0 64 64">
        <path d="M19 10h21l8 8v36H19z" />
        <path d="M40 10v10h10" />
        <path d="M26 28h16" />
        <path d="M26 36h16" />
        <path d="M26 44h11" />
      </svg>
    )
  }

  if (type === 'warning') {
    return (
      <svg aria-hidden="true" viewBox="0 0 64 64">
        <path d="M32 12l22 40H10z" />
        <path d="M32 25v13" />
        <path d="M32 46h.01" />
      </svg>
    )
  }

  if (type === 'shield') {
    return (
      <svg aria-hidden="true" viewBox="0 0 64 64">
        <path d="M32 9l19 8v14c0 13-8 22-19 26-11-4-19-13-19-26V17z" />
        <path d="M23 32l6 6 13-14" />
      </svg>
    )
  }

  if (type === 'target') {
    return (
      <svg aria-hidden="true" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r="22" />
        <circle cx="32" cy="32" r="12" />
        <circle cx="32" cy="32" r="3" />
        <path d="M32 6v8" />
        <path d="M32 50v8" />
        <path d="M6 32h8" />
        <path d="M50 32h8" />
      </svg>
    )
  }

  return null
}

function ProcessIcon({ type }) {
  if (type === 'upload') {
    return (
      <svg className="process-icon" aria-hidden="true" viewBox="0 0 64 64">
        <path d="M18 10h22l8 8v36H18z" />
        <path d="M40 10v10h10" />
        <path d="M32 42V24" />
        <path d="M24 32l8-8 8 8" />
      </svg>
    )
  }

  if (type === 'retrieve') {
    return (
      <svg className="process-icon" aria-hidden="true" viewBox="0 0 64 64">
        <path d="M16 12h28v24H16z" />
        <path d="M22 20h16" />
        <path d="M22 28h10" />
        <circle cx="41" cy="41" r="9" />
        <path d="M48 48l7 7" />
      </svg>
    )
  }

  if (type === 'generate') {
    return (
      <svg className="process-icon" aria-hidden="true" viewBox="0 0 64 64">
        <path d="M14 16h30a8 8 0 0 1 8 8v10a8 8 0 0 1-8 8H30l-12 9v-9h-4z" />
        <path d="M43 10l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" />
        <path d="M24 27h16" />
        <path d="M24 34h10" />
      </svg>
    )
  }

  if (type === 'highlight') {
    return (
      <svg className="process-icon" aria-hidden="true" viewBox="0 0 64 64">
        <path d="M17 12h30v40H17z" />
        <path d="M24 22h16" />
        <path d="M24 30h12" />
        <rect className="process-icon-fill" x="22" y="37" width="20" height="10" rx="2" />
        <path d="M24 42h16" />
      </svg>
    )
  }

  return null
}

function StackIcon({ type }) {
  if (type === 'frontend') {
    return (
      <svg className="stack-icon" aria-hidden="true" viewBox="0 0 64 64">
        <rect x="10" y="14" width="44" height="30" rx="4" />
        <path d="M24 52h16" />
        <path d="M32 44v8" />
        <path d="M25 27l-6 5 6 5" />
        <path d="M39 27l6 5-6 5" />
      </svg>
    )
  }

  if (type === 'backend') {
    return (
      <svg className="stack-icon" aria-hidden="true" viewBox="0 0 64 64">
        <rect x="12" y="12" width="40" height="12" rx="3" />
        <rect x="12" y="28" width="40" height="12" rx="3" />
        <rect x="12" y="44" width="40" height="8" rx="3" />
        <path d="M20 18h.01" />
        <path d="M20 34h.01" />
        <path d="M20 48h.01" />
      </svg>
    )
  }

  if (type === 'data') {
    return (
      <svg className="stack-icon" aria-hidden="true" viewBox="0 0 64 64">
        <ellipse cx="32" cy="16" rx="20" ry="8" />
        <path d="M12 16v24c0 4 9 8 20 8s20-4 20-8V16" />
        <path d="M12 28c0 4 9 8 20 8s20-4 20-8" />
      </svg>
    )
  }

  if (type === 'ai') {
    return (
      <svg className="stack-icon" aria-hidden="true" viewBox="0 0 64 64">
        <path d="M32 10l3 11 11 3-11 3-3 11-3-11-11-3 11-3z" />
        <path d="M48 36l2 7 7 2-7 2-2 7-2-7-7-2 7-2z" />
        <path d="M18 40l1.5 5 5 1.5-5 1.5-1.5 5-1.5-5-5-1.5 5-1.5z" />
      </svg>
    )
  }

  if (type === 'security') {
    return (
      <svg className="stack-icon" aria-hidden="true" viewBox="0 0 64 64">
        <path d="M32 9l19 8v14c0 13-8 22-19 26-11-4-19-13-19-26V17z" />
        <path d="M24 33h16" />
        <path d="M28 33v-5a4 4 0 0 1 8 0v5" />
        <rect x="25" y="33" width="14" height="12" rx="2" />
      </svg>
    )
  }

  return null
}

function FlowIcon({ type }) {
  if (type === 'auth') {
    return (
      <svg aria-hidden="true" viewBox="0 0 64 64">
        <circle cx="25" cy="24" r="8" />
        <path d="M13 50c2-10 8-15 18-15" />
        <path d="M38 35l13-13" />
        <path d="M45 22h8v8" />
      </svg>
    )
  }

  if (type === 'question') {
    return (
      <svg aria-hidden="true" viewBox="0 0 64 64">
        <path d="M14 16h36v26H28l-10 8v-8h-4z" />
        <path d="M29 25a6 6 0 1 1 7 6c-3 1-4 3-4 6" />
        <path d="M32 44h.01" />
      </svg>
    )
  }

  if (type === 'answer') {
    return (
      <svg aria-hidden="true" viewBox="0 0 64 64">
        <path d="M14 17h36v30H14z" />
        <path d="M22 27h20" />
        <path d="M22 36h12" />
        <path d="M43 10l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" />
      </svg>
    )
  }

  return <ProcessIcon type={type} />
}

function LatexFormula() {
  return (
    <div
      className="formula"
      aria-label="cosine similarity equals q dot d divided by the product of the L2 norms of q and d"
      dangerouslySetInnerHTML={cosineFormulaMarkup}
    />
  )
}

function UserFlowDiagram() {
  return (
    <div className="flow-diagram" aria-label="Authenticated question answering workflow">
      {userFlowSteps.map((step, index) => (
        <article className="flow-card" key={step.title}>
          <span className="flow-step-number">{String(index + 1).padStart(2, '0')}</span>
          <span className="flow-icon">
            <FlowIcon type={step.icon} />
          </span>
          <h3>{step.title}</h3>
          <p>{step.detail}</p>
        </article>
      ))}
    </div>
  )
}

function blockRevealNavigation(event) {
  event.preventDefault()
  event.stopPropagation()
  event.stopImmediatePropagation()
}

function isRagSlideActive(deck) {
  return deck?.getIndices?.().h === RAG_SLIDE_INDEX
}

function RagPipeline({ activeRagStep, setActiveRagStep, selectedRagStep }) {
  const deck = useReveal()

  useEffect(() => {
    if (!deck?.on) {
      return undefined
    }

    const handleSlideChanged = (event) => {
      if (event.indexh === RAG_SLIDE_INDEX) {
        setActiveRagStep(0)
      }
    }

    deck.on('slidechanged', handleSlideChanged)
    return () => deck.off('slidechanged', handleSlideChanged)
  }, [deck, setActiveRagStep])

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        !isRagSlideActive(deck)
      ) {
        return
      }

      if (event.key === 'ArrowRight' && activeRagStep < LAST_RAG_STEP_INDEX) {
        blockRevealNavigation(event)
        setActiveRagStep((step) => Math.min(step + 1, LAST_RAG_STEP_INDEX))
        return
      }

      if (event.key === 'ArrowLeft' && activeRagStep > 0) {
        blockRevealNavigation(event)
        setActiveRagStep((step) => Math.max(step - 1, 0))
      }
    }

    window.addEventListener('keydown', handleKeyDown, { capture: true })
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true })
  }, [activeRagStep, deck, setActiveRagStep])

  return (
    <div className="rag-layout">
      <figure className="figure-frame rag-figure">
        <img src={ragFigure} alt="Retrieval augmented generation pipeline" />
      </figure>
      <div className="rag-stepper" aria-live="polite">
        <div className="step-buttons" aria-label="RAG pipeline steps">
          {ragSteps.map((step, index) => (
            <button
              type="button"
              className={index === activeRagStep ? 'active' : ''}
              onClick={() => setActiveRagStep(index)}
              key={step.label}
            >
              {step.label}
            </button>
          ))}
        </div>
        <div className="step-meter" aria-hidden="true">
          <span style={{ width: `${((activeRagStep + 1) / ragSteps.length) * 100}%` }}></span>
        </div>
        <div className="step-detail">
          <p className="step-kicker">Step {activeRagStep + 1} of {ragSteps.length}</p>
          <h3>{selectedRagStep.title}</h3>
          <p>{selectedRagStep.detail}</p>
        </div>
      </div>
    </div>
  )
}

function ArchitectureDiagram() {
  return (
    <div className="architecture-diagram" aria-label="System architecture of SambidhanGPT">
      <div className="architecture-map">
        <article className="architecture-tier presentation-tier">
          <div className="architecture-heading">
            <span>Presentation Layer</span>
            <strong>React + Vite</strong>
          </div>
          <div className="architecture-node-list">
            {presentationModules.map((module) => (
              <div className="architecture-node" key={module}>{module}</div>
            ))}
          </div>
        </article>

        <div className="architecture-connector" aria-hidden="true">
          <span>REST / axios<br />JSON over HTTPS</span>
        </div>

        <article className="architecture-tier application-tier">
          <div className="architecture-heading">
            <span>Application Layer</span>
            <strong>Express.js + TypeScript</strong>
          </div>
          <div className="application-flow">
            <div className="architecture-node">
              Auth Middleware
              <span>Bearer token</span>
            </div>
            <div className="architecture-node">Routes &amp; Controllers</div>
            <div className="agent-layer">
              <p>Agent Layer</p>
              <div>
                {agentModules.map((module) => (
                  <span key={module}>{module}</span>
                ))}
              </div>
            </div>
            <div className="architecture-node">Drizzle ORM</div>
          </div>
        </article>

        <div className="architecture-connector architecture-connector-service" aria-hidden="true">
          <span>embed / generate<br />vector search</span>
        </div>

        <div className="architecture-services">
          <article className="service-card data-service">
            <span>Data Layer</span>
            <strong>PostgreSQL + pgvector</strong>
            <p>HNSW halfvec cosine index</p>
          </article>
          <article className="service-card gemini-service">
            <span>Google Gemini</span>
            <strong>2.5 Flash</strong>
            <p>embedding-001</p>
          </article>
        </div>
      </div>
      <JumpButton target={6} tone="secondary">Open RAG pipeline</JumpButton>
    </div>
  )
}

function App() {
  const [activeRagStep, setActiveRagStep] = useState(0)
  const selectedRagStep = ragSteps[activeRagStep]

  return (
    <main className="deck-app">
      <Deck
        config={revealConfig}
      >
        <Slide transition="slide" className="title-slide">
          <div className="slide-shell title-layout">
            <div className="title-copy">
              <p className="eyebrow">RAG + pgvector + Gemini + exact citations</p>
              <h1>SambidhanGPT</h1>
              <p className="title-subtitle">
                AI-Powered Legal Document Q&amp;A with PDF Citation Highlighting
              </p>
              <JumpButton target={1}>Start with the problem</JumpButton>
            </div>
            <div className="title-visual" aria-hidden="true">
              <div className="document-sheet">
                <div className="sheet-rule sheet-rule-wide"></div>
                <div className="sheet-rule"></div>
                <div className="sheet-rule sheet-rule-short"></div>
                <div className="highlight-band">Article 12: verified source</div>
                <div className="sheet-rule"></div>
                <div className="sheet-rule sheet-rule-wide"></div>
              </div>
              <div className="citation-chip">page 8, excerpt 3</div>
            </div>
          </div>
        </Slide>

        <Slide transition="slide">
          <div className="slide-shell">
            <SectionHeader
              eyebrow="Problem"
              title="Legal AI needs verifiable boundaries"
              lead="The project starts from a trust problem, not just an automation problem."
            />
            <div className="problem-grid">
              {problemPoints.map(({ title, detail, icon }) => (
                <article className="problem-card" key={title}>
                  <span className="problem-mark">
                    <ProblemIcon type={icon} />
                  </span>
                  <h3>{title}</h3>
                  <p>{detail}</p>
                </article>
              ))}
            </div>
          </div>
        </Slide>

        <Slide transition="slide">
          <div className="slide-shell">
            <SectionHeader
              eyebrow="Core idea"
              title="Answer from the PDF, then show the source"
              lead="SambidhanGPT keeps generation grounded by making source evidence part of the workflow."
            />
            <div className="process-strip">
              {processSteps.map((step, index) => (
                <Fragment animation="fade-up" asChild key={step.label}>
                  <div className="process-step">
                    <div className="process-step-top">
                      <span className="process-step-index">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <ProcessIcon type={step.icon} />
                    </div>
                    <strong>{step.label}</strong>
                  </div>
                </Fragment>
              ))}
              <div className="process-glow" aria-hidden="true"></div>
            </div>
            <div className="thesis-panel">
              <p>Every answer is constrained by uploaded document text.</p>
              <p>Every answer returns citations users can inspect.</p>
              <p>Citations jump to highlighted passages in the PDF viewer.</p>
            </div>
          </div>
        </Slide>

        <Slide transition="slide">
          <div className="slide-shell compact-slide">
            <SectionHeader
              eyebrow="Objectives"
              title="Build a citation-first legal document assistant"
            />
            <div className="checklist-grid">
              {objectives.map((objective) => (
                <div className="check-item" key={objective}>
                  <span aria-hidden="true">
                    <StatusIcon />
                  </span>
                  <p>{objective}</p>
                </div>
              ))}
            </div>
          </div>
        </Slide>

        <Slide transition="zoom">
          <div className="slide-shell figure-slide">
            <SectionHeader
              eyebrow="System overview"
              title="Three tiers with agent-backed retrieval"
              lead="React/Vite presents the workspace, Express/TypeScript coordinates agents, and PostgreSQL + Gemini provide evidence and generation."
            />
            <div className="architecture-layout">
              <ArchitectureDiagram />
            </div>
          </div>
        </Slide>

        <Slide transition="slide">
          <div className="slide-shell figure-slide">
            <SectionHeader
              eyebrow="User flow"
              title="From authenticated upload to highlighted answer"
              lead="The interaction remains simple while the system keeps ownership, evidence, and citation mapping intact."
            />
            <div className="flow-layout">
              <UserFlowDiagram />
              <div className="flow-list">
                {['Register or log in', 'Upload PDF', 'Ask questions', 'Inspect cited answer', 'Browse clauses, suggestions, and analysis'].map(
                  (item) => (
                    <p key={item}>{item}</p>
                  ),
                )}
              </div>
            </div>
          </div>
        </Slide>

        <Slide transition="zoom">
          <div className="slide-shell figure-slide">
            <SectionHeader
              eyebrow="RAG pipeline"
              title="Offline ingestion meets online question answering"
              lead="The same vector space connects document chunks to user questions."
            />
            <RagPipeline
              activeRagStep={activeRagStep}
              setActiveRagStep={setActiveRagStep}
              selectedRagStep={selectedRagStep}
            />
          </div>
        </Slide>

        <Slide transition="slide" className="figure-slide">
          <div className="slide-shell">
            <SectionHeader
              eyebrow="Retrieval and search"
              title="Cosine ranking with HNSW acceleration"
              lead="SambidhanGPT stores dense embeddings in PostgreSQL and ranks chunks by semantic proximity."
            />
            <div className="retrieval-layout">
              <div className="formula-panel">
                <p className="formula-label">cosine similarity</p>
                <LatexFormula />
                <ul>
                  <li>3072-dimensional embeddings</li>
                  <li>Smallest cosine distance gives top chunks</li>
                  <li><code>halfvec_cosine_ops</code> keeps pgvector search responsive</li>
                </ul>
              </div>
              <figure className="figure-frame hnsw-figure">
                <img src={hnswFigure} alt="Layered HNSW proximity graph" />
              </figure>
            </div>
          </div>
        </Slide>

        <Slide transition="slide">
          <div className="slide-shell">
            <SectionHeader
              eyebrow="Citation highlighting"
              title="The answer is useful because the source is visible"
            />
            <div className="citation-layout">
              <div className="answer-panel">
                <p className="user-question">What does the contract say about termination?</p>
                <p>
                  The agreement allows termination after written notice if a material breach is not
                  cured within the required period.
                </p>
                <button type="button" className="citation-button">Page 12 - termination clause</button>
              </div>
              <div className="pdf-panel">
                <div className="pdf-toolbar">legal-document.pdf</div>
                <div className="pdf-line long"></div>
                <div className="pdf-line"></div>
                <div className="pdf-highlight">material breach must be cured within the notice period</div>
                <div className="pdf-line"></div>
                <div className="pdf-line short"></div>
              </div>
            </div>
          </div>
        </Slide>

        <Slide transition="slide">
          <div className="slide-shell compact-slide">
            <SectionHeader
              eyebrow="Legal intelligence"
              title="Beyond chat: structured document understanding"
            />
            <div className="feature-panels">
              <Fragment animation="fade-up" asChild>
                <article>
                  <h3>Clause extraction</h3>
                  <p>Indemnity, termination, liability, payment, jurisdiction, amendment, definitions, penalties.</p>
                </article>
              </Fragment>
              <Fragment animation="fade-up" asChild>
                <article>
                  <h3>Suggested questions</h3>
                  <p>Document-specific prompts help users begin with the most relevant legal issues.</p>
                </article>
              </Fragment>
              <Fragment animation="fade-up" asChild>
                <article>
                  <h3>Analysis</h3>
                  <p>Summary, risks, obligations, and key points are generated from retrieved document text.</p>
                </article>
              </Fragment>
            </div>
          </div>
        </Slide>

        <Slide transition="slide">
          <div className="slide-shell">
            <SectionHeader
              eyebrow="Implementation stack"
              title="A self-hostable legal RAG stack"
            />
            <div className="stack-grid">
              {stackGroups.map(({ group, icon, items }) => (
                <article className="stack-tile" key={group}>
                  <div className="stack-tile-top">
                    <StackIcon type={icon} />
                    <h3>{group}</h3>
                  </div>
                  <p>{items.join(' / ')}</p>
                </article>
              ))}
            </div>
          </div>
        </Slide>

        <Slide transition="fade">
          <div className="slide-shell">
            <SectionHeader
              eyebrow="E2E verification and results"
              title="The tested behavior centers on trust"
              lead="The strongest result is that answers remain grounded and navigable back to source passages."
            />
            <div className="results-layout">
              <div className="results-list">
                {verificationItems.map((item) => (
                  <p key={item}><span aria-hidden="true"><StatusIcon /></span>{item}</p>
                ))}
              </div>
              <div className="result-statement">
                <strong>Result</strong>
                <p>Document upload, grounded Q&amp;A, citations, highlighting, legal features, and access isolation passed end-to-end checks.</p>
              </div>
            </div>
          </div>
        </Slide>

        <Slide transition="fade">
          <div className="slide-shell">
            <SectionHeader
              eyebrow="Limitations and future work"
              title="The next version improves scale, coverage, and legal fit"
            />
            <div className="future-layout">
              <div className="future-column">
                <h3>Current limits</h3>
                <p>No OCR for scanned PDFs</p>
                <p>Gemini dependency</p>
                <p>Slow large-document ingestion</p>
                <p>No deep legal reasoning beyond source text</p>
              </div>
              <div className="future-column future-column-accent">
                <h3>Next upgrades</h3>
                <p>OCR pipeline</p>
                <p>Background ingestion jobs</p>
                <p>Stronger auth and DB constraints</p>
                <p>Cross-document querying and Nepali legal terminology support</p>
              </div>
            </div>
          </div>
        </Slide>

        <Slide transition="fade" className="closing-slide">
          <div className="slide-shell closing-layout">
            <div>
              <p className="eyebrow">Closing</p>
              <h2>SambidhanGPT makes legal PDF Q&amp;A verifiable.</h2>
              <p className="closing-copy">
                The key contribution is not just answering, but showing exactly where the
                answer came from.
              </p>
            </div>
            <div className="closing-actions">
              <JumpButton target={4}>Architecture</JumpButton>
              <JumpButton target={6}>RAG pipeline</JumpButton>
              <JumpButton target={8}>Citation highlighting</JumpButton>
            </div>
          </div>
        </Slide>
      </Deck>
    </main>
  )
}

export default App
