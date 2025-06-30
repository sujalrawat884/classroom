# User Authentication Service

This component provides secure user authentication and management for the Enterprise AI Coding Assistant.

## Features

- JWT-based authentication
- User registration and management
- Role-based access control (admin/regular users)
- Secure password hashing with bcrypt
- PostgreSQL database for user storage

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
   uvicorn main:app --reload --port 8001
   ```

5. Access the API documentation at http://localhost:8001/docs

### Docker Deployment

The authentication service is included in the main `docker-compose.yml` file at the project root.

## API Endpoints

### POST /token
Authenticate a user and get an access token.

### POST /users
Create a new user.

### GET /users/me
Get the current authenticated user's information.

### GET /users
Get a list of all users (admin only).

### PUT /users/{user_id}
Update a user's information.

### DELETE /users/{user_id}
Delete a user (admin only).

## Security Considerations

- The JWT secret key should be a strong, random value in production
- Password hashing uses bcrypt with appropriate work factor
- First registered user automatically becomes an admin
- Role-based access control for administrative functions
- Input validation using Pydantic models

## Next Steps

This component will connect to the LLM Server API to provide authentication for API requests, and to the Model Router & Manager for user-specific model access control.