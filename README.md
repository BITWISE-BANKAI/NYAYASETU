# ⚖️ NyayaPath (न्यायपथ)
### AI-Powered Consumer Dispute Resolution & Legal Pleading System

[![Python](https://img.shields.io/badge/Python-3.11%2B-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115%2B-009688.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18-61DAFB.svg)](https://reactjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-pgvector-336791.svg)](https://github.com/pgvector/pgvector)
[![Ollama](https://img.shields.io/badge/Ollama-Local%20LLM-black.svg)](https://ollama.ai/)

**NyayaPath** is a legal AI platform designed specifically for Indian Consumer Protection Law under the **Consumer Protection Act, 2019 (CPA 2019)** and the **Consumer Protection (E-Commerce) Rules, 2020**.

NyayaPath transforms unstructured consumer grievances, invoices, warranty cards, technician job sheets, and communication transcripts into court-ready, formally pleaded petitions for filing before the **District (DCDRC)**, **State (SCDRC)**, or **National (NCDRC)** Consumer Disputes Redressal Commissions.

---

## 🌟 Core Innovations & Legal Engineering

NyayaPath resolves the common pitfalls of naive LLM legal generation through specialized architectural guarantees:

1. **Strict Cause-of-Action Pleading Hierarchy**:
   - **Ground 1 (Foundational)**: **Section 2(10) r/w Section 35** — *Defect in Goods* (for hardware, power-board, display, or manufacturing flaws).
   - **Ground 2 (Foundational)**: **Section 2(11) r/w Section 35** — *Deficiency in Service* (for warranty refusal, improper service, or unfounded claims of damage).
   - **Ground 3**: **Section 2(47)** — *Unfair Trade Practice* (for deceptive warranty representations and passing responsibility between entities).
   - **Ground 4**: **Consumer Protection (E-Commerce) Rules, 2020 (Rules 4, 5 & 6)** — Mandatory marketplace/seller grievance redressal obligations and prohibition against refusing return/refund of defective goods.
   - **Ground 5 (Conditional)**: **Product Liability under Chapter VI (Sections 82–87)** — Pleaded conditionally without prejudice to primary claims of defect/deficiency, ensuring statutory liability under Sections 84 & 85 is properly established.

2. **Multi-Entity Disambiguation & Liability Reservation**:
   - Separates distinct legal commercial entities instead of flattening them into a generic "Seller":
     - **E-Commerce Marketplace Intermediary** (e.g., Amazon Seller Services Pvt. Ltd.)
     - **Product Manufacturer** (e.g., Samsung India Electronics Pvt. Ltd.)
     - **Registered Merchant Seller** (as per Tax Invoice)
     - **Authorized Service Center / Provider**
   - Automatically pleads the protective legal reservation:
     > *"The exact legal identity of the third-party merchant seller and the respective liabilities of the marketplace entity and manufacturer shall be determined from the purchase invoice and warranty documentation."*

3. **Zero Fabrication of Identifiers (Hard Backend Sanitization)**:
   - Hard consistency rules prohibit the model from synthesizing placeholder document IDs (e.g., `Invoice number 001` or `INV-123`).
   - If an identifier is missing from user records, it is safely cited as: `Tax Invoice dated [Date] [Invoice number not specified in current records]`.

4. **Deterministic Pecuniary Jurisdiction Calculation**:
   - ₹0 to ₹50 Lakhs → **District Commission (DCDRC)**
   - ₹50 Lakhs to ₹2 Crores → **State Commission (SCDRC)**
   - Above ₹2 Crores → **National Commission (NCDRC)**

5. **Multi-Stage Consistency Gate (P0 Architectural Mandate)**:
   - Validates that all monetary figures (purchase prices, repair quotes, claim amounts) match source facts.
   - Strict ban on forbidden / out-of-context tokens (e.g., `"SWORN BEFORE ME"`, `"District Commissioner"`).
   - Cross-checks dates against the chronological incident timeline.

---

## 🏛️ System Architecture

```
                       ┌──────────────────────────────────────────────┐
                       │           Consumer Grievance Intake          │
                       │  (Narrative Text + Invoices + WhatsApp/OCR)  │
                       └──────────────────────┬───────────────────────┘
                                              │
                                              ▼
                       ┌──────────────────────────────────────────────┐
                       │    Stage 1 & 2: Fact Extraction & Scoring    │
                       │  - Qwen2.5-3B-Instruct (Instructor Schema)   │
                       │  - Multi-Entity & Timeline Extraction        │
                       │  - Deterministic Evidence Strength (0-100)   │
                       └──────────────────────┬───────────────────────┘
                                              │
                                              ▼
                       ┌──────────────────────────────────────────────┐
                       │    Stage 3: Hybrid RAG & InLegalBERT Rerank  │
                       │  - pgvector Embedding Search (qwen3-embed)   │
                       │  - Hierarchy Parent Chunk Reconstruction     │
                       │  - law-ai/InLegalBERT Bi-Encoder Reranking   │
                       └──────────────────────┬───────────────────────┘
                                              │
                                              ▼
                       ┌──────────────────────────────────────────────┐
                       │       Stage 4: Structured Legal Drafter      │
                       │  - nyayapath-drafter (Local LLM via Ollama)  │
                       │  - StructuredLegalSlots Generation           │
                       │  - Post-Generation Consistency Gate & Retry  │
                       │  - Synthetic ID Sanitization                 │
                       └──────────────────────┬───────────────────────┘
                                              │
                                              ▼
                       ┌──────────────────────────────────────────────┐
                       │   Stage 5: Template Engine & Final Complaint │
                       │  - Jinja2 DCDRC Formal Petition Formatting   │
                       │  - Pecuniary Jurisdiction Mapping            │
                       │  - Itemized Prayers under Section 39         │
                       └──────────────────────────────────────────────┘
```

---

## 💻 Tech Stack

### Backend
- **Framework**: Python 3.11+, FastAPI, Uvicorn
- **Database & Search**: PostgreSQL with `pgvector` extension, SQLAlchemy Async, Alembic
- **LLM & Structured Output**: Ollama, Instructor, OpenAI Python SDK
- **Models**:
  - `qwen2.5:3b-instruct-q4_K_M` (Fact Extraction)
  - `nyayapath-drafter` / `qwen2.5:7b-instruct` (Legal Drafting)
  - `qwen3-embedding:0.6b` (Dense Statute Embeddings)
  - `law-ai/InLegalBERT` (Transformer Reranker)
- **Templating & Validation**: Jinja2, Pydantic V2, Pytest

### Frontend
- **Framework**: React 18, Vite
- **Styling**: Tailwind CSS, Modern Neumorphic / Glassmorphic UI
- **Icons & UI**: Lucide React
- **Features**: Real-time pipeline execution tracking, Evidence strength visualizer, Statute inspector, One-click complaint copy/download.

---

## 📁 Repository Structure

```
nyaypath/
├── .gitignore                      # Root gitignore for Python, Node, DB & secrets
├── README.md                       # Project documentation
│
├── nyayapath_backend/              # FastAPI Backend Service
│   ├── api/                        # REST API routes
│   │   └── v1/
│   │       ├── endpoints_cases.py  # Case intake, status & pipeline triggers
│   │       └── endpoints_statutes.py # Statute inspection & query endpoints
│   ├── core/                       # Core configuration & DB engine
│   │   ├── config.py               # Environment settings (Pydantic BaseSettings)
│   │   └── database.py             # Async SQLAlchemy session factory
│   ├── models/                     # SQLAlchemy ORM database models
│   │   ├── grievance_case.py       # Case records & generated artifacts
│   │   └── legal_statute.py        # pgvector statute chunk store
│   ├── schemas/                    # Pydantic schemas
│   │   ├── extracted_facts.py      # Canonical consumer fact schema
│   │   ├── legal_retrieval.py      # RAG retrieval & rerank schemas
│   │   └── complaint_generation.py # StructuredLegalSlots schema
│   ├── services/                   # Core pipeline stages
│   │   ├── stage1_ocr_service.py   # OCR & document parser
│   │   ├── stage2_fact_service.py  # Small LLM fact extraction & scoring
│   │   ├── stage3_rag_service.py   # pgvector search + InLegalBERT rerank
│   │   ├── stage4_generator_service.py # Drafter LLM & consistency gate
│   │   └── template_service.py     # Jinja2 template assembler
│   ├── templates/                  # Court skeleton templates
│   │   └── dcdrc_complaint_skeleton.jinja2 # DCDRC consumer petition format
│   ├── scripts/                    # Seeding & migration scripts
│   │   ├── seed_data.json          # CPA 2019 & E-Commerce Rules corpus
│   │   └── seed_db.py              # pgvector statute chunk embedding loader
│   ├── tests/                      # Automated test suite
│   │   └── test_golden_set.py      # Golden set regression & schema tests
│   ├── requirements.txt            # Python dependencies
│   └── main.py                     # FastAPI application entrypoint
│
└── nyayapath_frontend/             # React + Vite Frontend
    ├── src/
    │   ├── components/             # Reusable UI components & forms
    │   ├── App.jsx                 # Main application view & pipeline UI
    │   └── index.css               # Neumorphic styling tokens
    ├── package.json                # Node dependencies
    └── vite.config.js              # Vite configuration
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Python**: 3.11 or higher
- **Node.js**: 18.x or higher
- **PostgreSQL**: 15+ with the `pgvector` extension installed
- **Ollama**: Running locally on `http://localhost:11434`

Ensure you have pulled the required Ollama models:
```bash
ollama pull qwen2.5:3b-instruct-q4_K_M
ollama pull qwen2.5:7b-instruct
ollama pull qwen3-embedding:0.6b
```

---

### 2. Backend Setup

1. **Navigate to the backend directory and activate virtual environment**:
   ```bash
   cd nyayapath_backend
   python -m venv .venv
   
   # Windows:
   .venv\Scripts\activate
   # Linux/macOS:
   source .venv/bin/activate
   ```

2. **Install Python dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure Environment Variables**:
   Copy `.env.example` to `.env` and adjust database credentials if necessary:
   ```bash
   cp .env.example .env
   ```

4. **Initialize Database Tables & Seed Statutes**:
   ```bash
   python create_tables.py
   python scripts/seed_db.py
   ```

5. **Start the FastAPI Backend Server**:
   ```bash
   python main.py
   # Server runs on http://127.0.0.1:8000
   # Interactive API docs: http://127.0.0.1:8000/docs
   ```

---

### 3. Frontend Setup

1. **Navigate to the frontend directory**:
   ```bash
   cd ../nyayapath_frontend
   ```

2. **Install dependencies and start Vite dev server**:
   ```bash
   npm install
   npm run dev
   # Frontend runs on http://localhost:5173
   ```

---

## 🧪 Running Automated Tests

NyayaPath includes regression tests and consistency validation via Pytest:

```bash
cd nyayapath_backend
pytest tests/test_golden_set.py -v
```

---

## 🛡️ Security & Privacy Notice
- **All model inferences run locally** via Ollama and local HuggingFace transformers. No confidential consumer grievance data or personal invoices are transmitted to third-party proprietary LLM APIs.
- The root `.gitignore` protects against accidental commit of `.env`, database dumps, uploaded receipts, and cached embeddings.

---

## 📄 License
This project is open-source under the [MIT License](LICENSE).
