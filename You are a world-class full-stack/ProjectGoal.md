You are a world-class full-stack developer and AI engineer. I want you to help me build a production-grade, secure, self-hosted AI coding assistant for enterprises — a GitHub Copilot alternative.

### 🔐 Key Requirements:
- Must run entirely locally (offline) — no data leaves the machine.
- Use open-source LLMs like CodeLLaMA or Mistral, hosted via Ollama or vLLM.
- Secure user login (JWT, OAuth2, or Keycloak)
- Integrates into VS Code via custom extension.
- Allows switching between multiple local LLMs.
- Admin dashboard for role management, model control, and logs.
- Optional RAG capability to answer questions from internal docs (LangChain or LlamaIndex + FAISS/Qdrant).
- Fully containerized with Docker, supporting air-gapped deployment.

---

### 🎯 Objective:
Generate flawless and secure implementations for each of the following components, one by one. Include:
- File/folder structure
- Full code with comments
- Required libraries
- Docker setup if needed
- Security considerations (auth, CORS, input sanitization)
- Testing instructions
- How it connects to the next module

---

### 🔧 Components to Develop (one at a time):
1. **LLM Server API**:
   - FastAPI/Node backend with `/autocomplete`, `/models`, `/chat` routes.
   - Accepts prompts and queries local LLMs via Ollama/vLLM.

2. **User Authentication**:
   - JWT-based secure login, signup, and role management.
   - Use PostgreSQL to store users.
   - Support optional OAuth2 or Keycloak later.

3. **Model Router & Manager**:
   - Backend logic to register multiple models and switch between them dynamically.
   - Include config for model metadata, tokens/sec limits, etc.

4. **VS Code Extension**:
   - TypeScript plugin with login modal, inline suggestions, and chat panel.
   - Connects securely to the backend via token.
   - Supports autocomplete + RAG query.

5. **Admin Dashboard (React)**:
   - View users, roles, active models, usage logs.
   - Add/remove models, assign roles.
   - Connects to backend with protected APIs.

6. **RAG Engine (Optional)**:
   - Upload PDF/Markdown/docs.
   - Use LangChain or LlamaIndex to embed and query with vector DB (FAISS or Qdrant).
   - Add `/ask-doc` endpoint to the backend.

7. **Air-Gapped Deployment**:
   - Docker Compose setup for local-only execution.
   - Remove all external network dependencies.
   - Provide local build of LLM models.
   - Include script to verify internet isolation.

8. **Documentation & Packaging**:
   - Write `README.md`, `.env.example`, and deployment guide.
   - Provide Notion-compatible documentation, setup flow, and security checklist.

---

### ⚠️ Additional Instructions:
- No external API calls or telemetry allowed.
- Avoid insecure dependencies or outdated libraries.
- All passwords/tokens must be stored securely.
- Prioritize maintainable, modular code.
- Explain each block and decision clearly.

---

Start with Component 1 (LLM Server API), then wait for confirmation before proceeding to the next.
