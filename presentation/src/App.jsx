import { Deck, Slide } from '@revealjs/react'
import katex from 'katex'
import 'reveal.js/reveal.css'
import 'katex/dist/katex.min.css'
import tuLogo from './assets/report/tribhuvan-university-logo.png'
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

const students = Object.freeze([
  'Neeraj Lamsal / Roll No. 79010201 / Batch 2079',
  'Nirajan Rijal / Roll No. 79010207 / Batch 2079',
  'Pradip Raj Basnet / Roll No. 79010216 / Batch 2079',
])

const studentNames = students.map((student) => student.split(' / ')[0]).join(', ')

const problemItems = Object.freeze([
  'Legal text is long and hard to search.',
  'LLMs can invent legal clauses.',
  'Answers need exact source proof.',
  'Users need document-specific answers.',
])

const objectives = Object.freeze([
  'Answer questions from uploaded legal PDFs.',
  'Highlight exact cited passages.',
  'Extract clauses, suggestions, and risks.',
  'Apply CSIT algorithms in practice.',
])

const literatureFindings = Object.freeze([
  {
    topic: 'LLM hallucination',
    insight: 'Fluent model memory is unsafe for legal answers without retrieval grounding.',
  },
  {
    topic: 'Semantic retrieval',
    insight: '3072-dimensional embeddings make question and document chunks comparable.',
  },
  {
    topic: 'RAG',
    insight: 'Offline ingestion and online retrieval reduce hallucination by constraining context.',
  },
  {
    topic: 'Vector database',
    insight: 'PostgreSQL + pgvector with HNSW supports self-hostable nearest-neighbour search.',
  },
])

const comparisonRows = Object.freeze([
  ['Strict grounding', 'No', 'Partial', 'Yes'],
  ['Passage citation', 'No', 'Page only', 'Character accurate'],
  ['Legal clauses', 'No', 'No', 'Yes'],
  ['Self-hostable', 'No', 'No', 'Yes'],
])

const cosineFormulaMarkup = Object.freeze({
  __html: katex.renderToString(
    String.raw`\cos(q,d)=\frac{\sum_i q_i d_i}{\sqrt{\sum_i q_i^2}\sqrt{\sum_i d_i^2}}`,
    {
      displayMode: true,
      throwOnError: false,
    },
  ),
})

const algorithmItems = Object.freeze([
  {
    name: 'Cosine similarity',
    course: 'Vector ranking',
    detail: 'Finds semantically closest chunks.',
  },
  {
    name: 'HNSW search',
    course: 'Fast retrieval',
    detail: 'Speeds up nearest-neighbour lookup.',
  },
  {
    name: 'Recursive chunking',
    course: 'Text splitting',
    detail: 'Builds overlapping PDF chunks.',
  },
  {
    name: 'String matching',
    course: 'Citation mapping',
    detail: 'Locates cited passages in the PDF.',
  },
  {
    name: 'PBKDF2 + HMAC',
    course: 'Security',
    detail: 'Protects passwords and tokens.',
  },
])

const preprocessingItems = Object.freeze([
  {
    title: 'PDF parsing',
    detail: 'Extract page-aware text with pdfjs-dist and preserve page offsets.',
  },
  {
    title: 'Chunking',
    detail: 'Create overlapping chunks so cross-boundary context remains retrievable.',
  },
  {
    title: 'Embedding',
    detail: 'Generate gemini-embedding-001 vectors with 3072 dimensions.',
  },
  {
    title: 'Storage',
    detail: 'Persist chunks, offsets, page numbers, and embeddings in PostgreSQL + pgvector.',
  },
])

const environmentGroups = Object.freeze([
  {
    label: 'Frontend',
    value: 'React 19, Vite 7, Tailwind CSS 4, shadcn/Radix UI, react-pdf',
  },
  {
    label: 'Backend',
    value: 'Express.js 5, Node.js, TypeScript, multer, agent modules',
  },
  {
    label: 'Data and AI',
    value: 'PostgreSQL, pgvector, Drizzle ORM, Gemini 2.5 Flash, gemini-embedding-001',
  },
  {
    label: 'Security and Tooling',
    value: 'Node crypto, PBKDF2, HMAC, Git, local development environment',
  },
])

const performanceMeasures = Object.freeze([
  {
    label: 'Retrieval',
    metric: 'Top-K = 5',
    note: 'Cosine-distance ranking with HNSW index for responsive vector search.',
  },
  {
    label: 'Unit checks',
    metric: '8 pass',
    note: 'Password hashing, chunking, offsets, embeddings, cosine ordering, upload, token expiry.',
  },
  {
    label: 'System checks',
    metric: '8 pass',
    note: 'Register/login, upload, grounded Q&A, refusal, citation highlight, clauses, isolation, history.',
  },
  {
    label: 'Trust checks',
    metric: 'Source visible',
    note: 'Citation click scrolls to page and highlights the cited passage.',
  },
])

const resultItems = Object.freeze([
  'Uploaded PDFs are ingested and made queryable.',
  'Answerable questions return grounded answers with citations.',
  'Unanswerable questions are refused instead of hallucinated.',
  'Citation highlighting works in most cases despite text-extraction differences.',
  'HNSW keeps retrieval responsive as chunk count grows.',
])

const conclusionItems = Object.freeze([
  'RAG keeps answers grounded in uploaded PDFs.',
  'Citations make every answer verifiable.',
  'Legal clauses and analysis improve document understanding.',
  'CSIT algorithms were applied in a real system.',
])

const futureItems = Object.freeze([
  {
    icon: 'ocr',
    text: 'Add OCR for scanned PDFs',
  },
  {
    icon: 'jobs',
    text: 'Move ingestion to background jobs',
  },
  {
    icon: 'security',
    text: 'Improve authentication and access control',
  },
  {
    icon: 'search',
    text: 'Support cross-document search',
  },
  {
    icon: 'language',
    text: 'Add Nepali legal terminology support',
  },
])

const acknowledgments = Object.freeze([
  {
    role: 'Supervisor',
    name: 'Mr. Akkal Bahadur Bist',
  },
  {
    role: 'Head / Coordinator',
    name: 'Department of CSIT, Amrit Campus; Asst. Prof. Dabbal Singh Mahara',
  },
  {
    role: 'Faculty',
    name: 'Department of Computer Science and Information Technology',
  },
  {
    role: 'Campus',
    name: 'Amrit Campus, Thamel, Kathmandu',
  },
  {
    role: 'Evaluating Committee',
    name: 'Supervisor, Coordinator, Internal Examiner, and External Examiner',
  },
])

function SectionHeader({ eyebrow, title, lead }) {
  return (
    <header className="section-header">
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      {lead ? <p className="lead">{lead}</p> : null}
    </header>
  )
}

function FormulaBlock() {
  return (
    <div
      className="formula-block"
      aria-label="Cosine similarity formula"
      dangerouslySetInnerHTML={cosineFormulaMarkup}
    />
  )
}

function StatusMark({ children }) {
  return <span className="status-mark">{children}</span>
}

function FutureIcon({ type }) {
  if (type === 'ocr') {
    return (
      <svg aria-hidden="true" viewBox="0 0 48 48">
        <path d="M13 6h17l7 7v29H13z" />
        <path d="M30 6v9h8" />
        <path d="M18 24h14" />
        <path d="M18 31h10" />
      </svg>
    )
  }

  if (type === 'jobs') {
    return (
      <svg aria-hidden="true" viewBox="0 0 48 48">
        <path d="M11 15h26" />
        <path d="M31 9l6 6-6 6" />
        <path d="M37 33H11" />
        <path d="M17 27l-6 6 6 6" />
      </svg>
    )
  }

  if (type === 'security') {
    return (
      <svg aria-hidden="true" viewBox="0 0 48 48">
        <path d="M24 6l14 6v11c0 9-5 15-14 19-9-4-14-10-14-19V12z" />
        <path d="M18 25h12" />
        <path d="M20 25v-4a4 4 0 0 1 8 0v4" />
      </svg>
    )
  }

  if (type === 'search') {
    return (
      <svg aria-hidden="true" viewBox="0 0 48 48">
        <circle cx="21" cy="21" r="10" />
        <path d="M29 29l9 9" />
        <path d="M17 21h8" />
      </svg>
    )
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 48 48">
      <circle cx="24" cy="24" r="15" />
      <path d="M9 24h30" />
      <path d="M24 9c5 5 5 25 0 30" />
      <path d="M24 9c-5 5-5 25 0 30" />
    </svg>
  )
}

function ArchitectureTier({ label, title, children }) {
  return (
    <article className="html-architecture-tier">
      <span>{label}</span>
      <h3>{title}</h3>
      <div>{children}</div>
    </article>
  )
}

function SystemArchitectureDiagram() {
  return (
    <div className="html-architecture" aria-label="System architecture of SambidhanGPT">
      <ArchitectureTier label="Presentation Layer" title="React + Vite">
        <p>PDF Viewer</p>
        <p>Chat Interface</p>
        <p>Clause Sidebar</p>
        <p>Analysis Panel</p>
      </ArchitectureTier>

      <div className="architecture-arrow">
        <span>REST API</span>
      </div>

      <ArchitectureTier label="Application Layer" title="Express.js + TypeScript">
        <p>Auth Middleware</p>
        <p>Routes and Controllers</p>
        <p>Agent Layer</p>
        <p>Drizzle ORM</p>
      </ArchitectureTier>

      <div className="architecture-arrow">
        <span>vector search</span>
      </div>

      <div className="html-service-stack">
        <article>
          <span>Data Layer</span>
          <h3>PostgreSQL + pgvector</h3>
          <p>Documents, chunks, vectors, citations</p>
        </article>
        <article>
          <span>External AI</span>
          <h3>Google Gemini</h3>
          <p>Embedding and grounded answer generation</p>
        </article>
      </div>
    </div>
  )
}

function CoverSlide() {
  return (
    <Slide transition="fade" className="cover-slide">
      <div className="cover-page">
        <div className="cover-institution">
          <p>Tribhuvan University</p>
          <p>Institute of Science and Technology</p>
          <p>Amrit Campus</p>
        </div>

        <img className="cover-logo" src={tuLogo} alt="Tribhuvan University logo" />

        <p className="cover-kicker">Project Work Report on</p>
        <h1>
          SambidhanGPT: AI-Powered Legal Document Question-Answering with PDF Citation
          Highlighting
        </h1>

        <div className="cover-supervision">
          <span>Under the Supervision of</span>
          <strong>Mr. Akkal Bahadur Bist</strong>
          <span>Department of Computer Science &amp; Information Technology</span>
          <span>Amrit Campus, Thamel, Kathmandu</span>
        </div>

        <p className="cover-degree">
          In partial fulfillment of the requirements for the degree of Bachelor of Science in
          Computer Science and Information Technology (B.Sc. CSIT)
        </p>

        <div className="cover-submission">
          <div>
            <strong>Submitted by</strong>
            {students.map((student) => (
              <span key={student}>{student}</span>
            ))}
          </div>
          <div>
            <strong>Submitted to</strong>
            <span>Department of Computer Science and Information Technology</span>
            <span>Amrit Campus, Thamel, Kathmandu</span>
          </div>
        </div>

        <p className="cover-date">July, 2026</p>
      </div>
    </Slide>
  )
}

function App() {
  return (
    <main className="deck-app">
      <Deck config={revealConfig}>
        <CoverSlide />

        <Slide transition="slide">
          <div className="slide-shell intro-slide">
            <SectionHeader
              eyebrow="Introduction / Problem / Objective"
              title="A citation-first assistant for legal PDFs"
              lead="SambidhanGPT answers from the uploaded document and shows the exact source passage for verification."
            />
            <div className="three-column">
              <article className="text-panel accent-blue">
                <h3>Introduction</h3>
                <p>
                  A web-based legal Q&amp;A system for constitutions, codes, contracts, and
                  policies.
                </p>
                <p>
                  Built with RAG, React, Express.js, PostgreSQL + pgvector, and Gemini.
                </p>
              </article>

              <article className="text-panel accent-red">
                <h3>Problem Statement</h3>
                <ul>
                  {problemItems.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>

              <article className="text-panel accent-green">
                <h3>Objectives</h3>
                <ul>
                  {objectives.map((objective) => (
                    <li key={objective}>{objective}</li>
                  ))}
                </ul>
              </article>
            </div>
          </div>
        </Slide>

        <Slide transition="slide">
          <div className="slide-shell literature-slide">
            <SectionHeader
              eyebrow="Literature Review"
              title="Main findings from existing systems"
              lead="The review establishes the need for strict grounding, passage-level citations, and legal-specific document understanding."
            />
            <div className="literature-layout">
              <div className="finding-grid">
                {literatureFindings.map((finding) => (
                  <article className="finding-card" key={finding.topic}>
                    <h3>{finding.topic}</h3>
                    <p>{finding.insight}</p>
                  </article>
                ))}
              </div>
              <table className="comparison-table">
                <thead>
                  <tr>
                    <th>Feature</th>
                    <th>General LLM</th>
                    <th>Document Chat</th>
                    <th>SambidhanGPT</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map(([feature, general, documentChat, sambidhan]) => (
                    <tr key={feature}>
                      <th>{feature}</th>
                      <td>{general}</td>
                      <td>{documentChat}</td>
                      <td className="table-positive">{sambidhan}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Slide>

        <Slide transition="slide">
          <div className="slide-shell algorithm-slide">
            <SectionHeader
              eyebrow="Used Algorithm With Mathematical Prospect"
              title="Core Algorithms Used"
              lead="SambidhanGPT combines vector retrieval, graph search, text processing, citation mapping, and cryptographic security."
            />
            <article className="formula-panel algorithm-formula-panel">
              <div>
                <p className="formula-label">Cosine similarity</p>
                <FormulaBlock />
              </div>
            </article>
            <div className="algorithm-strip">
              {algorithmItems.map((item) => (
                <article key={item.name}>
                  <span>{item.course}</span>
                  <h3>{item.name}</h3>
                  <p>{item.detail}</p>
                </article>
              ))}
            </div>
          </div>
        </Slide>

        <Slide transition="slide">
          <div className="slide-shell methodology-slide">
            <SectionHeader
              eyebrow="Research Methodology"
              title="SambidhanGPT System Architecture"
              lead="Presentation, application, data, and external AI layers used to build the system."
            />
            <SystemArchitectureDiagram />
          </div>
        </Slide>

        <Slide transition="slide">
          <div className="slide-shell preprocessing-slide">
            <SectionHeader
              eyebrow="Data Collection / Preprocessing"
              title="Uploaded PDFs become searchable, citable evidence"
              lead="The system processes text-based legal PDFs and stores both semantic vectors and source-location metadata."
            />
            <div className="pipeline-steps">
              {preprocessingItems.map((item, index) => (
                <article key={item.title}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <h3>{item.title}</h3>
                  <p>{item.detail}</p>
                </article>
              ))}
            </div>
            <div className="preprocessing-note">
              <strong>Important limitation</strong>
              <p>
                Scanned image-only PDFs are outside the current scope because the implemented
                pipeline does not include OCR.
              </p>
            </div>
          </div>
        </Slide>

        <Slide transition="slide">
          <div className="slide-shell environment-slide">
            <SectionHeader
              eyebrow="Experimental Environment"
              title="Implementation stack used for development and testing"
            />
            <div className="environment-grid">
              {environmentGroups.map((group) => (
                <article className="environment-card" key={group.label}>
                  <h3>{group.label}</h3>
                  <p>{group.value}</p>
                </article>
              ))}
            </div>
            <div className="environment-band">
              <StatusMark>Language: TypeScript</StatusMark>
              <StatusMark>Database: PostgreSQL + pgvector</StatusMark>
              <StatusMark>LLM: Gemini 2.5 Flash</StatusMark>
              <StatusMark>Embedding: 3072 dimensions</StatusMark>
            </div>
          </div>
        </Slide>

        <Slide transition="slide">
          <div className="slide-shell performance-slide">
            <SectionHeader
              eyebrow="Performance Measure Tools"
              title="Measurement focused on retrieval, correctness, and trust"
              lead="The report evaluates behavior with unit tests, system tests, retrieval configuration, and citation verification."
            />
            <div className="measure-grid">
              {performanceMeasures.map((measure) => (
                <article className="measure-card" key={measure.label}>
                  <span>{measure.label}</span>
                  <strong>{measure.metric}</strong>
                  <p>{measure.note}</p>
                </article>
              ))}
            </div>
            <div className="testing-matrix">
              <div>
                <h3>Unit Testing</h3>
                <p>Hashing, chunking, page mapping, embeddings, cosine order, file filter, token expiry.</p>
              </div>
              <div>
                <h3>System Testing</h3>
                <p>Authentication, upload, grounded answers, refusal, highlighting, clauses, isolation, history.</p>
              </div>
            </div>
          </div>
        </Slide>

        <Slide transition="slide">
          <div className="slide-shell result-slide">
            <SectionHeader
              eyebrow="Result Analysis"
              title="The implemented system meets the core trust objective"
              lead="Results are presented around the observable behavior required for a trustworthy legal assistant."
            />
            <div className="result-layout">
              <div className="result-board">
                {resultItems.map((item) => (
                  <p key={item}>
                    <StatusMark>Pass</StatusMark>
                    {item}
                  </p>
                ))}
              </div>
              <article className="citation-demo">
                <div className="chat-card">
                  <span>User question</span>
                  <p>What does the document say about rights and obligations?</p>
                </div>
                <div className="answer-card">
                  <span>Grounded answer</span>
                  <p>Answer generated only from retrieved context.</p>
                  <button type="button">Page citation</button>
                </div>
                <div className="pdf-card" aria-hidden="true">
                  <span className="pdf-toolbar">legal-document.pdf</span>
                  <span className="pdf-line wide"></span>
                  <span className="pdf-line"></span>
                  <span className="pdf-highlight">cited source passage highlighted</span>
                  <span className="pdf-line short"></span>
                </div>
              </article>
            </div>
          </div>
        </Slide>

        <Slide transition="slide">
          <div className="slide-shell conclusion-slide">
            <SectionHeader
              eyebrow="Conclusion"
              title="SambidhanGPT makes legal PDF Q&A verifiable"
              lead="The system demonstrates a practical citation-first approach for legal document understanding."
            />
            <div className="conclusion-grid">
              {conclusionItems.map((item, index) => (
                <article className="conclusion-card" key={item}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <p>{item}</p>
                </article>
              ))}
            </div>
          </div>
        </Slide>

        <Slide transition="slide">
          <div className="slide-shell future-slide">
            <SectionHeader
              eyebrow="Future Recommendations"
              title="Next improvements"
              lead="The next version should improve document coverage, scale, security, and Nepali legal usability."
            />
            <div className="future-grid">
              {futureItems.map((item) => (
                <article className="future-card" key={item.text}>
                  <span className="future-icon">
                    <FutureIcon type={item.icon} />
                  </span>
                  <p>{item.text}</p>
                </article>
              ))}
            </div>
          </div>
        </Slide>

        <Slide transition="fade">
          <div className="slide-shell acknowledgement-slide">
            <SectionHeader
              eyebrow="Acknowledgments"
              title="With sincere gratitude"
              lead="Acknowledgment is extended to the people and institutions who guided, supported, and evaluated the project."
            />
            <div className="ack-grid">
              {acknowledgments.map((item) => (
                <article className="ack-card" key={item.role}>
                  <span>{item.role}</span>
                  <h3>{item.name}</h3>
                </article>
              ))}
            </div>
            <div className="student-footer">
              <p>{studentNames}</p>
            </div>
          </div>
        </Slide>
      </Deck>
    </main>
  )
}

export default App
