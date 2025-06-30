from fastapi import FastAPI, HTTPException, Depends, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import httpx
import logging
import os
import json
import time
from datetime import datetime
import uuid
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("llm_server")

# Initialize FastAPI app
app = FastAPI(
    title="Enterprise AI Coding Assistant API",
    description="A secure, self-hosted API for AI code completion and assistance",
    version="1.0.0"
)

# Add CORS middleware - restrict to your VS Code extension and admin dashboard origins in production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Replace with specific origins in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Define request/response models
class AutocompleteRequest(BaseModel):
    prompt: str = Field(..., description="The code context to generate completions for")
    model_id: str = Field(..., description="The ID of the LLM model to use")
    max_tokens: int = Field(256, description="Maximum number of tokens to generate")
    temperature: float = Field(0.2, description="Temperature for generation (0.0-1.0)")
    stop_sequences: Optional[List[str]] = Field(None, description="Sequences that stop generation")
    
class ChatRequest(BaseModel):
    messages: List[Dict[str, str]] = Field(..., description="List of chat messages")
    model_id: str = Field(..., description="The ID of the LLM model to use")
    max_tokens: int = Field(1024, description="Maximum number of tokens to generate")
    temperature: float = Field(0.7, description="Temperature for generation (0.0-1.0)")
    stream: bool = Field(False, description="Whether to stream the response")

class ModelInfo(BaseModel):
    id: str = Field(..., description="Unique identifier for the model")
    name: str = Field(..., description="Display name of the model")
    context_length: int = Field(..., description="Maximum context length in tokens")
    capabilities: List[str] = Field(..., description="List of model capabilities")
    is_active: bool = Field(True, description="Whether the model is currently active")

# In-memory model registry (replace with database in production)
DEFAULT_MODELS = [
    {
        "id": "codellama-7b",
        "name": "CodeLlama 7B",
        "context_length": 4096,
        "capabilities": ["code_completion", "chat"],
        "is_active": True
    },
    {
        "id": "mistral-7b",
        "name": "Mistral 7B",
        "context_length": 8192,
        "capabilities": ["code_completion", "chat"],
        "is_active": True
    }
]

# Initialize model registry
model_registry = DEFAULT_MODELS.copy()

# Ollama API client
class OllamaClient:
    def __init__(self, base_url=None):
        self.base_url = base_url or os.getenv("OLLAMA_API_URL", "http://localhost:11434")
        self.client = httpx.AsyncClient(timeout=60.0)
    
    async def generate(self, model_id, prompt, max_tokens=256, temperature=0.2, stop=None):
        url = f"{self.base_url}/api/generate"
        payload = {
            "model": model_id,
            "prompt": prompt,
            "max_tokens": max_tokens,
            "temperature": temperature,
        }
        if stop:
            payload["stop"] = stop
            
        try:
            response = await self.client.post(url, json=payload)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            logger.error(f"Ollama API error: {str(e)}")
            raise HTTPException(status_code=500, detail=f"LLM service error: {str(e)}")
    
    async def chat(self, model_id, messages, max_tokens=1024, temperature=0.7):
        url = f"{self.base_url}/api/chat"
        payload = {
            "model": model_id,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
        }
        
        try:
            response = await self.client.post(url, json=payload)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            logger.error(f"Ollama API error: {str(e)}")
            raise HTTPException(status_code=500, detail=f"LLM service error: {str(e)}")
    
    async def list_models(self):
        url = f"{self.base_url}/api/tags"
        try:
            response = await self.client.get(url)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            logger.error(f"Ollama API error: {str(e)}")
            raise HTTPException(status_code=500, detail=f"LLM service error: {str(e)}")

# Initialize Ollama client
ollama_client = OllamaClient()

# Request ID middleware for tracking
@app.middleware("http")
async def add_request_id(request: Request, call_next):
    request_id = str(uuid.uuid4())
    request.state.request_id = request_id
    
    # Log request
    logger.info(f"Request {request_id} started: {request.method} {request.url.path}")
    start_time = time.time()
    
    response = await call_next(request)
    
    # Log response time
    process_time = time.time() - start_time
    logger.info(f"Request {request_id} completed in {process_time:.4f}s with status {response.status_code}")
    
    response.headers["X-Request-ID"] = request_id
    return response

# Error handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception in request {request.state.request_id}: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An unexpected error occurred", "request_id": request.state.request_id}
    )

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

# Model endpoints
@app.get("/models", response_model=List[ModelInfo])
async def get_models():
    """Get list of available LLM models"""
    # Sync with Ollama's available models
    try:
        ollama_models = await ollama_client.list_models()
        # Convert Ollama models to our format
        available_models = []
        for model in ollama_models.get('models', []):
            model_info = {
                "id": model["name"],
                "name": model["name"].replace(":", " ").title(),
                "context_length": 4096,  # Default, could be extracted from model details
                "capabilities": ["code_completion", "chat"],
                "is_active": True
            }
            available_models.append(model_info)
        
        # Add default models that might not be in Ollama yet
        for default_model in DEFAULT_MODELS:
            if not any(m["id"] == default_model["id"] for m in available_models):
                available_models.append(default_model)
        
        logger.info(f"Retrieved {len(available_models)} total models ({len(ollama_models.get('models', []))} from Ollama)")
        return available_models
    except Exception as e:
        logger.warning(f"Could not retrieve models from Ollama: {str(e)}")
        # Fallback to default models
        return model_registry

# Code completion endpoint
@app.post("/autocomplete")
async def autocomplete(request: AutocompleteRequest):
    """Generate code completions based on the provided prompt"""
    logger.info(f"Autocomplete request for model {request.model_id}")
    
    # Validate model exists in Ollama
    try:
        ollama_models = await ollama_client.list_models()
        model_exists = any(model["name"] == request.model_id for model in ollama_models.get('models', []))
        if not model_exists:
            available_models = [model["name"] for model in ollama_models.get('models', [])]
            raise HTTPException(
                status_code=404, 
                detail=f"Model {request.model_id} not found. Available models: {available_models}"
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.warning(f"Could not validate model availability: {str(e)}")
        # Continue anyway and let Ollama handle the error
    
    # Call Ollama for completion
    response = await ollama_client.generate(
        model_id=request.model_id,
        prompt=request.prompt,
        max_tokens=request.max_tokens,
        temperature=request.temperature,
        stop=request.stop_sequences
    )
    
    # Process and return the response
    completion = response.get("response", "")
    
    # Log token usage (for billing/monitoring)
    prompt_tokens = response.get("prompt_tokens", 0)
    completion_tokens = response.get("completion_tokens", 0)
    logger.info(f"Generated {completion_tokens} tokens from {prompt_tokens} prompt tokens")
    
    return {
        "completion": completion,
        "model": request.model_id,
        "usage": {
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
            "total_tokens": prompt_tokens + completion_tokens
        }
    }

# Chat endpoint
@app.post("/chat")
async def chat(request: ChatRequest):
    """Generate a chat response based on the provided messages"""
    logger.info(f"Chat request for model {request.model_id}")
    
    # Validate model exists
    model_exists = any(model["id"] == request.model_id for model in model_registry)
    if not model_exists:
        raise HTTPException(status_code=404, detail=f"Model {request.model_id} not found")
    
    # Call Ollama for chat
    response = await ollama_client.chat(
        model_id=request.model_id,
        messages=request.messages,
        max_tokens=request.max_tokens,
        temperature=request.temperature
    )
    
    # Process and return the response
    message = response.get("message", {})
    
    # Log token usage (for billing/monitoring)
    prompt_tokens = response.get("prompt_tokens", 0)
    completion_tokens = response.get("completion_tokens", 0)
    logger.info(f"Generated {completion_tokens} tokens from {prompt_tokens} prompt tokens")
    
    return {
        "message": message,
        "model": request.model_id,
        "usage": {
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
            "total_tokens": prompt_tokens + completion_tokens
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)