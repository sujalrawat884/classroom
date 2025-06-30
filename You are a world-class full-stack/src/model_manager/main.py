from fastapi import FastAPI, HTTPException, Depends, status, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
import logging
import os
import httpx
import uuid
import json
from dotenv import load_dotenv
from sqlalchemy import create_engine, Column, String, Boolean, DateTime, Text, Integer, Float, ForeignKey, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship
import asyncio

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("model_manager")

# Database Configuration
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@db:5432/aicodingassistant")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Initialize FastAPI app
app = FastAPI(
    title="Enterprise AI Coding Assistant - Model Manager",
    description="Model management and routing for the AI Coding Assistant",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Replace with specific origins in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database Models
class Model(Base):
    __tablename__ = "models"
    
    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, index=True)
    provider = Column(String, index=True)  # 'ollama', 'vllm', etc.
    model_id = Column(String)  # The ID used by the provider
    description = Column(Text, nullable=True)
    context_length = Column(Integer)
    is_active = Column(Boolean, default=True)
    is_default = Column(Boolean, default=False)
    capabilities = Column(JSON)  # ['code_completion', 'chat', 'rag', etc.]
    parameters = Column(JSON, nullable=True)  # Default parameters like temperature, top_p, etc.
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    access_controls = relationship("ModelAccessControl", back_populates="model", cascade="all, delete-orphan")
    usage_logs = relationship("ModelUsageLog", back_populates="model", cascade="all, delete-orphan")

class ModelAccessControl(Base):
    __tablename__ = "model_access_controls"
    
    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    model_id = Column(String, ForeignKey("models.id", ondelete="CASCADE"))
    user_id = Column(String, index=True)  # Foreign key to users table (managed by auth service)
    role_id = Column(String, index=True, nullable=True)  # Optional role-based access
    can_use = Column(Boolean, default=True)
    token_limit = Column(Integer, nullable=True)  # Optional token limit per day/request
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    model = relationship("Model", back_populates="access_controls")

class ModelUsageLog(Base):
    __tablename__ = "model_usage_logs"
    
    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    model_id = Column(String, ForeignKey("models.id", ondelete="CASCADE"))
    user_id = Column(String, index=True)
    request_type = Column(String)  # 'completion', 'chat', etc.
    prompt_tokens = Column(Integer)
    completion_tokens = Column(Integer)
    total_tokens = Column(Integer)
    latency_ms = Column(Float)
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    model = relationship("Model", back_populates="usage_logs")

# Create tables
Base.metadata.create_all(bind=engine)

# Pydantic Models
class ModelBase(BaseModel):
    name: str
    provider: str
    model_id: str
    description: Optional[str] = None
    context_length: int
    capabilities: List[str]
    parameters: Optional[Dict[str, Any]] = None

class ModelCreate(ModelBase):
    is_active: bool = True
    is_default: bool = False

class ModelUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    context_length: Optional[int] = None
    is_active: Optional[bool] = None
    is_default: Optional[bool] = None
    capabilities: Optional[List[str]] = None
    parameters: Optional[Dict[str, Any]] = None

class ModelResponse(ModelBase):
    id: str
    is_active: bool
    is_default: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        orm_mode = True

class AccessControlBase(BaseModel):
    model_id: str
    user_id: str
    role_id: Optional[str] = None
    can_use: bool = True
    token_limit: Optional[int] = None

class AccessControlCreate(AccessControlBase):
    pass

class AccessControlUpdate(BaseModel):
    can_use: Optional[bool] = None
    token_limit: Optional[int] = None

class AccessControlResponse(AccessControlBase):
    id: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        orm_mode = True

class UsageLogCreate(BaseModel):
    model_id: str
    user_id: str
    request_type: str
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    latency_ms: float

class UsageLogResponse(UsageLogCreate):
    id: str
    timestamp: datetime
    
    class Config:
        orm_mode = True

class ModelStats(BaseModel):
    model_id: str
    model_name: str
    total_requests: int
    total_tokens: int
    avg_latency_ms: float

# Helper functions
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Ollama API client
class OllamaClient:
    def __init__(self, base_url=None):
        self.base_url = base_url or os.getenv("OLLAMA_API_URL", "http://localhost:11434")
        self.client = httpx.AsyncClient(timeout=60.0)
    
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

# Authentication dependency (placeholder - will be replaced with actual JWT auth)
async def get_current_user():
    # This is a placeholder. In production, this would verify the JWT token
    # and return the authenticated user information.
    return {"id": "system", "is_admin": True}

async def get_current_admin_user():
    # This is a placeholder. In production, this would verify the JWT token
    # and check if the user has admin privileges.
    return {"id": "system", "is_admin": True}

# Endpoints
@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

@app.get("/models", response_model=List[ModelResponse])
async def get_models(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get list of available models"""
    models = db.query(Model).all()
    return models

@app.get("/models/{model_id}", response_model=ModelResponse)
async def get_model(
    model_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific model by ID"""
    model = db.query(Model).filter(Model.id == model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    return model

@app.post("/models", response_model=ModelResponse)
async def create_model(
    model: ModelCreate,
    current_user: dict = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Create a new model (admin only)"""
    # If this is set as default, unset any existing defaults
    if model.is_default:
        existing_defaults = db.query(Model).filter(Model.is_default == True).all()
        for default_model in existing_defaults:
            default_model.is_default = False
    
    db_model = Model(**model.dict())
    db.add(db_model)
    db.commit()
    db.refresh(db_model)
    
    logger.info(f"Created new model: {model.name}")
    return db_model

@app.put("/models/{model_id}", response_model=ModelResponse)
async def update_model(
    model_id: str,
    model_update: ModelUpdate,
    current_user: dict = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Update a model (admin only)"""
    db_model = db.query(Model).filter(Model.id == model_id).first()
    if not db_model:
        raise HTTPException(status_code=404, detail="Model not found")
    
    # If this is being set as default, unset any existing defaults
    if model_update.is_default:
        existing_defaults = db.query(Model).filter(Model.is_default == True).filter(Model.id != model_id).all()
        for default_model in existing_defaults:
            default_model.is_default = False
    
    # Update model fields
    model_data = model_update.dict(exclude_unset=True)
    for key, value in model_data.items():
        setattr(db_model, key, value)
    
    db_model.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_model)
    
    logger.info(f"Updated model: {db_model.name}")
    return db_model

@app.delete("/models/{model_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_model(
    model_id: str,
    current_user: dict = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Delete a model (admin only)"""
    db_model = db.query(Model).filter(Model.id == model_id).first()
    if not db_model:
        raise HTTPException(status_code=404, detail="Model not found")
    
    db.delete(db_model)
    db.commit()
    
    logger.info(f"Deleted model: {db_model.name}")
    return None

@app.get("/models/sync/ollama", response_model=List[ModelResponse])
async def sync_ollama_models(
    current_user: dict = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Sync models from Ollama (admin only)"""
    try:
        ollama_models = await ollama_client.list_models()
        
        # Process each model from Ollama
        created_models = []
        for model_info in ollama_models.get("models", []):
            model_id = model_info.get("name")
            
            # Check if model already exists
            existing_model = db.query(Model).filter(
                Model.provider == "ollama",
                Model.model_id == model_id
            ).first()
            
            if not existing_model:
                # Create new model entry
                new_model = Model(
                    name=model_id.capitalize(),
                    provider="ollama",
                    model_id=model_id,
                    description=f"Ollama model: {model_id}",
                    context_length=4096,  # Default, can be updated later
                    is_active=True,
                    capabilities=["code_completion", "chat"],
                    parameters={
                        "temperature": 0.7,
                        "top_p": 0.9,
                        "max_tokens": 1024
                    }
                )
                db.add(new_model)
                created_models.append(new_model)
        
        if created_models:
            db.commit()
            for model in created_models:
                db.refresh(model)
            
            logger.info(f"Synced {len(created_models)} new models from Ollama")
        
        # Return all Ollama models
        return db.query(Model).filter(Model.provider == "ollama").all()
    
    except Exception as e:
        logger.error(f"Error syncing Ollama models: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error syncing models: {str(e)}")

@app.post("/access", response_model=AccessControlResponse)
async def create_access_control(
    access: AccessControlCreate,
    current_user: dict = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Create a new access control entry (admin only)"""
    # Check if model exists
    model = db.query(Model).filter(Model.id == access.model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    
    # Check if access control already exists
    existing = db.query(ModelAccessControl).filter(
        ModelAccessControl.model_id == access.model_id,
        ModelAccessControl.user_id == access.user_id
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Access control already exists")
    
    db_access = ModelAccessControl(**access.dict())
    db.add(db_access)
    db.commit()
    db.refresh(db_access)
    
    logger.info(f"Created access control for user {access.user_id} to model {model.name}")
    return db_access

@app.put("/access/{access_id}", response_model=AccessControlResponse)
async def update_access_control(
    access_id: str,
    access_update: AccessControlUpdate,
    current_user: dict = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Update an access control entry (admin only)"""
    db_access = db.query(ModelAccessControl).filter(ModelAccessControl.id == access_id).first()
    if not db_access:
        raise HTTPException(status_code=404, detail="Access control not found")
    
    # Update fields
    access_data = access_update.dict(exclude_unset=True)
    for key, value in access_data.items():
        setattr(db_access, key, value)
    
    db_access.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_access)
    
    logger.info(f"Updated access control {access_id}")
    return db_access

@app.delete("/access/{access_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_access_control(
    access_id: str,
    current_user: dict = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Delete an access control entry (admin only)"""
    db_access = db.query(ModelAccessControl).filter(ModelAccessControl.id == access_id).first()
    if not db_access:
        raise HTTPException(status_code=404, detail="Access control not found")
    
    db.delete(db_access)
    db.commit()
    
    logger.info(f"Deleted access control {access_id}")
    return None

@app.get("/access/user/{user_id}", response_model=List[AccessControlResponse])
async def get_user_access(
    user_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all access controls for a user"""
    # Only admins or the user themselves can view their access controls
    if current_user["id"] != user_id and not current_user["is_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    access_controls = db.query(ModelAccessControl).filter(ModelAccessControl.user_id == user_id).all()
    return access_controls

@app.post("/usage", response_model=UsageLogResponse)
async def log_model_usage(
    usage: UsageLogCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Log model usage"""
    # Check if model exists
    model = db.query(Model).filter(Model.id == usage.model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    
    # Create usage log
    db_usage = ModelUsageLog(**usage.dict())
    db.add(db_usage)
    db.commit()
    db.refresh(db_usage)
    
    return db_usage

@app.get("/usage/stats", response_model=List[ModelStats])
async def get_usage_stats(
    current_user: dict = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Get usage statistics for all models (admin only)"""
    # This is a simplified implementation - in production, use SQL aggregation
    models = db.query(Model).all()
    stats = []
    
    for model in models:
        usage_logs = db.query(ModelUsageLog).filter(ModelUsageLog.model_id == model.id).all()
        
        if not usage_logs:
            stats.append(ModelStats(
                model_id=model.id,
                model_name=model.name,
                total_requests=0,
                total_tokens=0,
                avg_latency_ms=0
            ))
            continue
        
        total_requests = len(usage_logs)
        total_tokens = sum(log.total_tokens for log in usage_logs)
        avg_latency = sum(log.latency_ms for log in usage_logs) / total_requests if total_requests > 0 else 0
        
        stats.append(ModelStats(
            model_id=model.id,
            model_name=model.name,
            total_requests=total_requests,
            total_tokens=total_tokens,
            avg_latency_ms=avg_latency
        ))
    
    return stats

@app.get("/default-model", response_model=ModelResponse)
async def get_default_model(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get the default model"""
    default_model = db.query(Model).filter(Model.is_default == True).first()
    if not default_model:
        # If no default is set, return the first active model
        default_model = db.query(Model).filter(Model.is_active == True).first()
    
    if not default_model:
        raise HTTPException(status_code=404, detail="No active models found")
    
    return default_model

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8002, reload=True)