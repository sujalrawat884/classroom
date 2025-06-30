# Model Manager Service

This component provides model management and routing for the Enterprise AI Coding Assistant.

## Features

- Model registration and management
- User access control for models
- Usage tracking and statistics
- Integration with Ollama for model discovery
- Support for multiple model providers

## Setup

### Prerequisites

- Python 3.9+
- PostgreSQL database
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
   uvicorn main:app --reload --port 8002
   ```

5. Access the API documentation at http://localhost:8002/docs

### Docker Deployment

The model manager service is included in the main `docker-compose.yml` file at the project root.

## API Endpoints

### GET /models
Get a list of all available models.

### GET /models/{model_id}
Get details for a specific model.

### POST /models
Create a new model (admin only).

### PUT /models/{model_id}
Update a model (admin only).

### DELETE /models/{model_id}
Delete a model (admin only).

### GET /models/sync/ollama
Sync models from Ollama (admin only).

### POST /access
Create a new access control entry (admin only).

### PUT /access/{access_id}
Update an access control entry (admin only).

### DELETE /access/{access_id}
Delete an access control entry (admin only).

### GET /access/user/{user_id}
Get all access controls for a user.

### POST /usage
Log model usage.

### GET /usage/stats
Get usage statistics for all models (admin only).

### GET /default-model
Get the default model.

## Security Considerations

- Access controls are enforced for all model operations
- Usage tracking for monitoring and auditing
- Role-based access control for administrative functions

## Next Steps

This component will connect to the VS Code Extension to provide model selection capabilities, and to the Admin Dashboard for model management.