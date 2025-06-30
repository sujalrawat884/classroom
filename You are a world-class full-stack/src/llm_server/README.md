# LLM Server API

This component provides the backend API for the Enterprise AI Coding Assistant. It handles communication with local LLM models via Ollama or vLLM.

## Features

- `/autocomplete` endpoint for code completion
- `/chat` endpoint for conversational AI
- `/models` endpoint to list available models
- Secure, self-hosted operation with no data leaving the machine
- Configurable model parameters (temperature, max tokens, etc.)
- Request tracking and logging

## Setup

### Prerequisites

- Python 3.9+
- [Ollama](https://github.com/ollama/ollama) installed and running locally
- Docker and Docker Compose (for containerized deployment)

### Local Development

1. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Copy `.env.example` to `.env` and configure:
   ```bash
   cp .env.example .env
   ```

4. Run the server:
   ```bash
   uvicorn main:app --reload
   ```

5. Access the API documentation at http://localhost:8000/docs

### Docker Deployment

1. Build and start the containers:
   ```bash
   docker-compose up -d
   ```

2. The API will be available at http://localhost:8000

## API Endpoints

### GET /health
Health check endpoint.

### GET /models
Returns a list of available LLM models.

### POST /autocomplete
Generates code completions based on the provided prompt.

Request body: