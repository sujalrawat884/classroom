# Enterprise AI Coding Assistant

A secure, self-hosted AI coding assistant for enterprises - a GitHub Copilot alternative.

## Features

- Completely self-hosted and offline - no data leaves your machine
- Uses open-source LLMs like CodeLLaMA or Mistral via Ollama
- Secure user authentication
- Multiple model support with easy switching
- Inline code suggestions
- Chat interface for coding questions
- Code explanation
- Customizable settings

## Requirements

- VS Code 1.80.0 or higher
- Self-hosted backend services (LLM Server, Auth Service, Model Manager)

## Setup

1. Install the extension from the VSIX file or VS Code Marketplace
2. Configure the server URLs in the extension settings
3. Log in with your credentials
4. Start coding with AI assistance!

## Extension Settings

This extension contributes the following settings:

* `enterprise-ai-coding-assistant.serverUrl`: URL of the AI Coding Assistant server
* `enterprise-ai-coding-assistant.authUrl`: URL of the authentication server
* `enterprise-ai-coding-assistant.modelManagerUrl`: URL of the model manager server
* `enterprise-ai-coding-assistant.inlineSuggestions`: Enable inline code suggestions
* `enterprise-ai-coding-assistant.suggestionDelay`: Delay before showing suggestions
* `enterprise-ai-coding-assistant.maxTokens`: Maximum number of tokens to generate
* `enterprise-ai-coding-assistant.temperature`: Temperature for code generation (0.0-1.0)

## Commands

* `AI Coding Assistant: Login`: Log in to the AI Coding Assistant
* `AI Coding Assistant: Logout`: Log out from the AI Coding Assistant
* `AI Coding Assistant: Open Chat`: Open the chat interface
* `AI Coding Assistant: Generate Code`: Generate code based on the current context
* `AI Coding Assistant: Explain Selected Code`: Explain the selected code
* `AI Coding Assistant: Switch Model`: Switch between available AI models
* `AI Coding Assistant: Settings`: Open the settings panel

## Security

This extension connects only to your self-hosted services and does not send any data to external servers. All communication is secured with JWT authentication.

## License

This extension is licensed under the MIT License.