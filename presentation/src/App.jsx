import { useState } from 'react'
import { Deck, Fragment, Slide, useReveal } from '@revealjs/react'
import 'reveal.js/reveal.css'
import architectureFigure from './assets/report/system-architecture.png'
import hnswFigure from './assets/report/hnsw-graph.png'
import ragFigure from './assets/report/rag-pipeline.png'
import sequenceFigure from './assets/report/qa-sequence.png'
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

const problemPoints = Object.freeze([
  ['Long documents', 'Legal PDFs are dense, formal, and slow to inspect manually.'],
  ['Hallucination risk', 'General LLMs can invent clauses or legal references.'],
  ['Weak trust signals', 'Answers without exact sources are hard to verify.'],
  ['Document specificity', 'Users need answers from the PDF they uploaded.'],
])

const objectives = Object.freeze([
  'Document-grounded question answering',
  'Exact PDF citation highlighting',
  'Clause extraction, suggested questions, and document analysis',
  'Real-world application of CSIT algorithms',
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

const stackGroups = Object.freeze([
  ['Frontend', 'React 19', 'Vite', 'Tailwind', 'react-pdf/pdfjs'],
  ['Backend', 'Express 5', 'TypeScript', 'Agent modules'],
  ['Data', 'PostgreSQL', 'pgvector', 'Drizzle ORM'],
  ['AI', 'Gemini 2.5 Flash', 'gemini-embedding-001'],
  ['Security', 'PBKDF2', 'HMAC', 'User isolation'],
])

const verificationItems = Object.freeze([
  'Upload and ingestion passed',
  'Answerable questions return grounded answers',
  'Unanswerable questions are refused',
  'Citation clicks scroll and highlight',
  'User isolation works',
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

function App() {
  const [activeRagStep, setActiveRagStep] = useState(2)
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
              {problemPoints.map(([title, detail]) => (
                <Fragment animation="fade-up" asChild key={title}>
                  <article className="problem-card">
                    <span className="problem-mark">{title.slice(0, 2).toUpperCase()}</span>
                    <h3>{title}</h3>
                    <p>{detail}</p>
                  </article>
                </Fragment>
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
              {['Upload PDF', 'Retrieve evidence', 'Generate answer', 'Highlight source'].map(
                (step, index) => (
                  <Fragment animation="fade-up" asChild key={step}>
                    <div className="process-step">
                      <span>{String(index + 1).padStart(2, '0')}</span>
                      <strong>{step}</strong>
                    </div>
                  </Fragment>
                ),
              )}
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
                <Fragment animation="fade-up" asChild key={objective}>
                  <div className="check-item">
                    <span aria-hidden="true">OK</span>
                    <p>{objective}</p>
                  </div>
                </Fragment>
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
              <figure className="figure-frame tall-figure">
                <img src={architectureFigure} alt="System architecture of SambidhanGPT" />
              </figure>
              <div className="architecture-labels">
                <Fragment animation="fade-up" asChild>
                  <p><strong>Frontend</strong><span>PDF viewer, chat, clauses, analysis</span></p>
                </Fragment>
                <Fragment animation="fade-up" asChild>
                  <p><strong>Backend agents</strong><span>Auth, ingestion, RAG, clauses, suggestions</span></p>
                </Fragment>
                <Fragment animation="fade-up" asChild>
                  <p><strong>Data + Gemini</strong><span>pgvector retrieval, embeddings, generation</span></p>
                </Fragment>
                <JumpButton target={6} tone="secondary">Open RAG pipeline</JumpButton>
              </div>
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
              <figure className="figure-frame wide-figure">
                <img src={sequenceFigure} alt="Question-answering sequence diagram" />
              </figure>
              <div className="flow-list">
                {['Register or log in', 'Upload PDF', 'Ask questions', 'Inspect cited answer', 'Browse clauses, suggestions, and analysis'].map(
                  (item) => (
                    <Fragment animation="fade-up" asChild key={item}>
                      <p>{item}</p>
                    </Fragment>
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
                <div className="formula">q . d / (||q|| * ||d||)</div>
                <ul>
                  <Fragment animation="fade-up" asChild><li>3072-dimensional embeddings</li></Fragment>
                  <Fragment animation="fade-up" asChild><li>Smallest cosine distance gives top chunks</li></Fragment>
                  <Fragment animation="fade-up" asChild><li><code>halfvec_cosine_ops</code> keeps pgvector search responsive</li></Fragment>
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
              {stackGroups.map(([group, ...items]) => (
                <Fragment animation="fade-up" asChild key={group}>
                  <article className="stack-tile">
                    <h3>{group}</h3>
                    <p>{items.join(' / ')}</p>
                  </article>
                </Fragment>
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
                  <Fragment animation="fade-up" asChild key={item}>
                    <p><span aria-hidden="true">OK</span>{item}</p>
                  </Fragment>
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
