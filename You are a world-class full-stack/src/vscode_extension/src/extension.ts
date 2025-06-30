import * as vscode from 'vscode';
import axios, { AxiosInstance } from 'axios';

// Types
interface AuthToken {
  access_token: string;
  token_type: string;
  user_id: string;
  username: string;
  is_admin: boolean;
}

interface Model {
  id: string;
  name: string;
  provider: string;
  model_id: string;
  description?: string;
  context_length: number;
  is_active: boolean;
  is_default: boolean;
  capabilities: string[];
  parameters?: any;
}

interface CompletionResponse {
  completion: string;
  model: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatResponse {
  message: ChatMessage;
  model: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// Extension state
let authToken: AuthToken | null = null;
let currentModel: Model | null = null;
let chatViewProvider: ChatViewProvider | null = null;
let modelsViewProvider: ModelsViewProvider | null = null;
let settingsViewProvider: SettingsViewProvider | null = null;
let statusBarItem: vscode.StatusBarItem;
let completionProvider: vscode.Disposable | null = null;

// HTTP clients
let apiClient: AxiosInstance;
let authClient: AxiosInstance;
let modelManagerClient: AxiosInstance;

export function activate(context: vscode.ExtensionContext) {
  console.log('Enterprise AI Coding Assistant is now active');

  // Initialize configuration
  const config = vscode.workspace.getConfiguration('enterprise-ai-coding-assistant');
  const serverUrl = config.get<string>('serverUrl') || 'http://localhost:8000';
  const authUrl = config.get<string>('authUrl') || 'http://localhost:8001';
  const modelManagerUrl = config.get<string>('modelManagerUrl') || 'http://localhost:8002';

  // Initialize HTTP clients
  apiClient = axios.create({
    baseURL: serverUrl,
    timeout: 30000,
  });

  authClient = axios.create({
    baseURL: authUrl,
    timeout: 10000,
  });

  modelManagerClient = axios.create({
    baseURL: modelManagerUrl,
    timeout: 10000,
  });

  // Create status bar item
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.text = "$(robot) AI Assistant";
  statusBarItem.tooltip = "Enterprise AI Coding Assistant";
  statusBarItem.command = "enterprise-ai-coding-assistant.showChat";
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  // Load saved token
  const savedToken = context.globalState.get<AuthToken>('authToken');
  if (savedToken) {
    authToken = savedToken;
    updateStatusBar(true);
    setupAxiosInterceptors();
    loadDefaultModel();
  } else {
    updateStatusBar(false);
  }

  // Register webview providers
  chatViewProvider = new ChatViewProvider(context.extensionUri);
  modelsViewProvider = new ModelsViewProvider(context.extensionUri);
  settingsViewProvider = new SettingsViewProvider(context.extensionUri);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('aiCodingAssistantChat', chatViewProvider),
    vscode.window.registerWebviewViewProvider('aiCodingAssistantModels', modelsViewProvider),
    vscode.window.registerWebviewViewProvider('aiCodingAssistantSettings', settingsViewProvider)
  );

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('enterprise-ai-coding-assistant.login', () => login(context)),
    vscode.commands.registerCommand('enterprise-ai-coding-assistant.logout', () => logout(context)),
    vscode.commands.registerCommand('enterprise-ai-coding-assistant.showChat', showChat),
    vscode.commands.registerCommand('enterprise-ai-coding-assistant.generateCode', generateCode),
    vscode.commands.registerCommand('enterprise-ai-coding-assistant.explainCode', explainCode),
    vscode.commands.registerCommand('enterprise-ai-coding-assistant.switchModel', switchModel),
    vscode.commands.registerCommand('enterprise-ai-coding-assistant.settings', showSettings)
  );

  // Setup inline suggestions if enabled
  if (config.get<boolean>('inlineSuggestions')) {
    setupInlineSuggestions(context);
  }
}

function setupAxiosInterceptors() {
  // Add auth token to API requests
  apiClient.interceptors.request.use(config => {
    if (authToken) {
      config.headers.Authorization = `Bearer ${authToken.access_token}`;
    }
    return config;
  });

  modelManagerClient.interceptors.request.use(config => {
    if (authToken) {
      config.headers.Authorization = `Bearer ${authToken.access_token}`;
    }
    return config;
  });
}

async function loadDefaultModel() {
  try {
    const response = await modelManagerClient.get<Model>('/default-model');
    currentModel = response.data;
    updateStatusBar(true);
    
    // Update models view if available
    if (modelsViewProvider) {
      modelsViewProvider.setCurrentModel(currentModel);
    }
  } catch (error) {
    console.error('Failed to load default model:', error);
    vscode.window.showErrorMessage('Failed to load AI model. Please check your connection.');
  }
}

async function login(context: vscode.ExtensionContext) {
  // Show login form
  const username = await vscode.window.showInputBox({
    prompt: 'Enter your username',
    placeHolder: 'Username'
  });

  if (!username) return;

  const password = await vscode.window.showInputBox({
    prompt: 'Enter your password',
    password: true,
    placeHolder: 'Password'
  });

  if (!password) return;

  try {
    // Create form data for token request
    const params = new URLSearchParams();
    params.append('username', username);
    params.append('password', password);

    const response = await authClient.post<AuthToken>('/token', params);
    authToken = response.data;
    
    // Save token
    context.globalState.update('authToken', authToken);
    
    // Setup interceptors and load model
    setupAxiosInterceptors();
    await loadDefaultModel();
    
    updateStatusBar(true);
    vscode.window.showInformationMessage(`Logged in as ${username}`);
  } catch (error) {
    console.error('Login failed:', error);
    vscode.window.showErrorMessage('Login failed. Please check your credentials.');
  }
}

async function logout(context: vscode.ExtensionContext) {
  // Clear token
  authToken = null;
  context.globalState.update('authToken', null);
  currentModel = null;
  
  updateStatusBar(false);
  vscode.window.showInformationMessage('Logged out successfully');
}

function updateStatusBar(isLoggedIn: boolean) {
  if (isLoggedIn && currentModel) {
    statusBarItem.text = `$(robot) AI: ${currentModel.name}`;
    statusBarItem.tooltip = `Enterprise AI Coding Assistant - Using ${currentModel.name}`;
    statusBarItem.backgroundColor = undefined;
  } else if (isLoggedIn) {
    statusBarItem.text = `$(robot) AI Assistant`;
    statusBarItem.tooltip = `Enterprise AI Coding Assistant - Logged in`;
    statusBarItem.backgroundColor = undefined;
  } else {
    statusBarItem.text = `$(robot) AI: Not Connected`;
    statusBarItem.tooltip = `Enterprise AI Coding Assistant - Not logged in`;
    statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
  }
}

async function showChat() {
  if (!authToken) {
    const result = await vscode.window.showWarningMessage(
      'You need to log in to use the AI Coding Assistant.',
      'Login',
      'Cancel'
    );
    
    if (result === 'Login') {
      vscode.commands.executeCommand('enterprise-ai-coding-assistant.login');
    }
    return;
  }
  
  vscode.commands.executeCommand('aiCodingAssistantChat.focus');
}

async function generateCode() {
  if (!authToken || !currentModel) {
    vscode.window.showWarningMessage('Please log in and select a model first.');
    return;
  }
  
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showInformationMessage('No active editor found.');
    return;
  }
  
  // Get current selection or line
  const selection = editor.selection;
  const text = selection.isEmpty 
    ? editor.document.lineAt(selection.active.line).text
    : editor.document.getText(selection);
  
  // Show progress indicator
  vscode.window.withProgress({
    location: vscode.ProgressLocation.Notification,
    title: 'Generating code...',
    cancellable: true
  }, async (progress, token) => {
    try {
      const config = vscode.workspace.getConfiguration('enterprise-ai-coding-assistant');
      
      const response = await apiClient.post<CompletionResponse>('/autocomplete', {
        prompt: text,
        model_id: currentModel?.model_id,
        max_tokens: config.get<number>('maxTokens') || 256,
        temperature: config.get<number>('temperature') || 0.2,
        stop_sequences: ["\n\n"]
      }, { signal: token.onCancellationRequested });
      
      // Insert the completion
      editor.edit(editBuilder => {
        if (selection.isEmpty) {
          // If no selection, insert at current position
          editBuilder.insert(selection.active, response.data.completion);
        } else {
          // If there's a selection, replace it
          editBuilder.replace(selection, text + response.data.completion);
        }
      });
      
    } catch (error) {
      if (axios.isCancel(error)) {
        vscode.window.showInformationMessage('Code generation cancelled.');
      } else {
        console.error('Code generation failed:', error);
        vscode.window.showErrorMessage('Failed to generate code. Please try again.');
      }
    }
    
    return Promise.resolve();
  });
}

async function explainCode() {
  if (!authToken || !currentModel) {
    vscode.window.showWarningMessage('Please log in and select a model first.');
    return;
  }
  
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showInformationMessage('No active editor found.');
    return;
  }
  
  // Get current selection
  const selection = editor.selection;
  if (selection.isEmpty) {
    vscode.window.showInformationMessage('Please select code to explain.');
    return;
  }
  
  const text = editor.document.getText(selection);
  
  // Show progress indicator
  vscode.window.withProgress({
    location: vscode.ProgressLocation.Notification,
    title: 'Analyzing code...',
    cancellable: true
  }, async (progress, token) => {
    try {
      const response = await apiClient.post<ChatResponse>('/chat', {
        messages: [
          { role: 'system', content: 'You are a helpful coding assistant. Explain the following code in a clear and concise manner.' },
          { role: 'user', content: text }
        ],
        model_id: currentModel?.model_id,
        max_tokens: 1024,
        temperature: 0.7
      }, { signal: token.onCancellationRequested });
      
      // Show explanation in chat view
      if (chatViewProvider) {
        chatViewProvider.addMessage({
          role: 'user',
          content: `Explain this code:\n\`\`\`\n${text}\n\`\`\``
        });
        
        chatViewProvider.addMessage(response.data.message);
        vscode.commands.executeCommand('aiCodingAssistantChat.focus');
      }
      
    } catch (error) {
      if (axios.isCancel(error)) {
        vscode.window.showInformationMessage('Code explanation cancelled.');
      } else {
        console.error('Code explanation failed:', error);
        vscode.window.showErrorMessage('Failed to explain code. Please try again.');
      }
    }
    
    return Promise.resolve();
  });
}

async function switchModel() {
  if (!authToken) {
    vscode.window.showWarningMessage('Please log in first.');
    return;
  }
  
  try {
    const response = await modelManagerClient.get<Model[]>('/models');
    const models = response.data.filter(model => model.is_active);
    
    if (models.length === 0) {
      vscode.window.showInformationMessage('No active models available.');
      return;
    }
    
    const modelItems = models.map(model => ({
      label: model.name,
      description: model.provider,
      detail: model.description,
      model: model
    }));
    
    const selected = await vscode.window.showQuickPick(modelItems, {
      placeHolder: 'Select a model',
      title: 'Switch AI Model'
    });
    
    if (selected) {
      currentModel = selected.model;
      updateStatusBar(true);
      
      // Update models view if available
      if (modelsViewProvider) {
        modelsViewProvider.setCurrentModel(currentModel);
      }
      
      vscode.window.showInformationMessage(`Switched to model: ${currentModel.name}`);
    }
  } catch (error) {
    console.error('Failed to load models:', error);
    vscode.window.showErrorMessage('Failed to load models. Please check your connection.');
  }
}

function showSettings() {
  vscode.commands.executeCommand('aiCodingAssistantSettings.focus');
}

function setupInlineSuggestions(context: vscode.ExtensionContext) {
  // Remove existing provider if any
  if (completionProvider) {
    completionProvider.dispose();
  }
  
  // Create completion provider
  completionProvider = vscode.languages.registerInlineCompletionItemProvider({ pattern: '**' }, {
    async provideInlineCompletionItems(document, position, context, token) {
      // Check if logged in and model selected
      if (!authToken || !currentModel) {
        return null;
      }
      
      // Get configuration
      const config = vscode.workspace.getConfiguration('enterprise-ai-coding-assistant');
      const suggestionDelay = config.get<number>('suggestionDelay') || 500;
      
      // Debounce suggestions
      await new Promise(resolve => setTimeout(resolve, suggestionDelay));
      
      // Get context before cursor
      const linePrefix = document.lineAt(position).text.substring(0, position.character);
      
      // Skip if line is empty or too short
      if (linePrefix.trim().length < 3) {
        return null;
      }
      
      // Get a few lines before for context
      const startLine = Math.max(0, position.line - 10);
      const contextRange = new vscode.Range(startLine, 0, position.line, position.character);
      const contextText = document.getText(contextRange);
      
      try {
        const response = await apiClient.post<CompletionResponse>('/autocomplete', {
          prompt: contextText,
          model_id: currentModel?.model_id,
          max_tokens: config.get<number>('maxTokens') || 256,
          temperature: config.get<number>('temperature') || 0.2,
          stop_sequences: ["\n\n"]
        }, { signal: token.isCancellationRequested ? new AbortController().signal : undefined });
        
        // Create completion item
        const text = response.data.completion;
        return [
          {
            text,
            range: new vscode.Range(position, position)
          }
        ];
      } catch (error) {
        console.error('Inline suggestion failed:', error);
        return null;
      }
    }
  });
  
  context.subscriptions.push(completionProvider);
}

// WebView Providers
class ChatViewProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;
  private _messages: ChatMessage[] = [];
  
  constructor(private readonly _extensionUri: vscode.Uri) {}
  
  resolveWebviewView(webviewView: vscode.WebviewView): void {
    this._view = webviewView;
    
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri]
    };
    
    this._updateWebview();
    
    webviewView.webview.onDidReceiveMessage(async (data) => {
      if (data.type === 'sendMessage') {
        await this._sendMessage(data.message);
      }
    });
  }
  
  addMessage(message: ChatMessage): void {
    this._messages.push(message);
    this._updateWebview();
  }
  
  private async _sendMessage(content: string): Promise<void> {
    if (!authToken || !currentModel) {
      if (this._view) {
        this._view.webview.postMessage({ type: 'error', message: 'Please log in and select a model first.' });
      }
      return;
    }
    
    // Add user message
    const userMessage: ChatMessage = { role: 'user', content };
    this._messages.push(userMessage);
    this._updateWebview();
    
    try {
      // Prepare messages for API
      const messages = [
        { role: 'system', content: 'You are a helpful AI coding assistant.' },
        ...this._messages.slice(-10) // Include last 10 messages for context
      ];
      
      // Send to API
      const response = await apiClient.post<ChatResponse>('/chat', {
        messages,
        model_id: currentModel?.model_id,
        max_tokens: 1024,
        temperature: 0.7
      });
      
      // Add response
      this._messages.push(response.data.message);
      this._updateWebview();
    } catch (error) {
      console.error('Chat message failed:', error);
      if (this._view) {
        this._view.webview.postMessage({ 
          type: 'error', 
          message: 'Failed to send message. Please try again.' 
        });
      }
    }
  }
  
  private _updateWebview(): void {
    if (this._view) {
      this._view.webview.html = this._getHtmlForWebview();
    }
  }
  
  private _getHtmlForWebview(): string {
    const messagesHtml = this._messages.map(msg => {
      const isUser = msg.role === 'user';
      const className = isUser ? 'user-message' : 'assistant-message';
      
      // Convert markdown-like code blocks to HTML
      let content = msg.content;
      content = content.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
      content = content.replace(/`([^`]+)`/g, '<code>$1</code>');
      
      return `
        <div class="message ${className}">
          <div class="avatar">${isUser ? '👤' : '🤖'}</div>
          <div class="content">${content}</div>
        </div>
      `;
    }).join('');
    
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>AI Coding Assistant Chat</title>
        <style>
          body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            padding: 0;
            margin: 0;
          }
          .chat-container {
            display: flex;
            flex-direction: column;
            height: 100vh;
            max-height: 100vh;
          }
          .messages {
            flex: 1;
            overflow-y: auto;
            padding: 10px;
          }
          .message {
            display: flex;
            margin-bottom: 10px;
            padding: 8px;
            border-radius: 6px;
          }
          .user-message {
            background-color: var(--vscode-editor-inactiveSelectionBackground);
          }
          .assistant-message {
            background-color: var(--vscode-sideBar-background);
          }
          .avatar {
            margin-right: 8px;
            font-size: 1.2em;
          }
          .content {
            flex: 1;
          }
          pre {
            background-color: var(--vscode-textCodeBlock-background);
            padding: 8px;
            border-radius: 4px;
            overflow-x: auto;
          }
          code {
            font-family: var(--vscode-editor-font-family);
            font-size: var(--vscode-editor-font-size);
          }
          .input-container {
            display: flex;
            padding: 10px;
            border-top: 1px solid var(--vscode-panel-border);
          }
          #message-input {
            flex: 1;
            padding: 8px;
            border: 1px solid var(--vscode-input-border);
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border-radius: 4px;
          }
          #send-button {
            margin-left: 8px;
            padding: 8px 12px;
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 4px;
            cursor: pointer;
          }
          #send-button:hover {
            background-color: var(--vscode-button-hoverBackground);
          }
          .status {
            padding: 8px;
            text-align: center;
            font-style: italic;
            color: var(--vscode-descriptionForeground);
          }
        </style>
      </head>
      <body>
        <div class="chat-container">
          <div class="messages" id="messages">
            ${messagesHtml || '<div class="status">Start a conversation with the AI coding assistant.</div>'}
          </div>
          <div class="input-container">
            <input type="text" id="message-input" placeholder="Ask a coding question...">
            <button id="send-button">Send</button>
          </div>
        </div>
        
        <script>
          const vscode = acquireVsCodeApi();
          const messagesContainer = document.getElementById('messages');
          const messageInput = document.getElementById('message-input');
          const sendButton = document.getElementById('send-button');
          
          // Scroll to bottom
          function scrollToBottom() {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
          }
          
          // Send message
          function sendMessage() {
            const message = messageInput.value.trim();
            if (message) {
              vscode.postMessage({
                type: 'sendMessage',
                message: message
              });
              messageInput.value = '';
            }
          }
          
          // Event listeners
          sendButton.addEventListener('click', sendMessage);
          messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
              sendMessage();
            }
          });
          
          // Handle messages from extension
          window.addEventListener('message', (event) => {
            const message = event.data;
            if (message.type === 'error') {
              // Show error
              const errorDiv = document.createElement('div');
              errorDiv.className = 'status';
              errorDiv.textContent = message.message;
              messagesContainer.appendChild(errorDiv);
              scrollToBottom();
            }
          });
          
          // Initial scroll
          scrollToBottom();
        </script>
      </body>
      </html>
    `;
  }
}

class ModelsViewProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;
  private _currentModel: Model | null = null;
  
  constructor(private readonly _extensionUri: vscode.Uri) {}
  
  resolveWebviewView(webviewView: vscode.WebviewView): void {
    this._view = webviewView;
    
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri]
    };
    
    this._updateWebview();
    
    webviewView.webview.onDidReceiveMessage(async (data) => {
      if (data.type === 'switchModel') {
        vscode.commands.executeCommand('enterprise-ai-coding-assistant.switchModel');
      } else if (data.type === 'refreshModels') {
        this._loadModels();
      }
    });
    
    // Load models when view becomes visible
    this._loadModels();
  }
  
  setCurrentModel(model: Model | null): void {
    this._currentModel = model;
    this._updateWebview();
  }
  
  private async _loadModels(): Promise<void> {
    if (!authToken) {
      if (this._view) {
        this._view.webview.postMessage({ 
          type: 'modelsLoaded', 
          models: [],
          error: 'Please log in first.'
        });
      }
      return;
    }
    
    try {
      const response = await modelManagerClient.get<Model[]>('/models');
      if (this._view) {
        this._view.webview.postMessage({ 
          type: 'modelsLoaded', 
          models: response.data,
          currentModel: this._currentModel
        });
      }
    } catch (error) {
      console.error('Failed to load models:', error);
      if (this._view) {
        this._view.webview.postMessage({ 
          type: 'modelsLoaded', 
          models: [],
          error: 'Failed to load models. Please check your connection.'
        });
      }
    }
  }
  
  private _updateWebview(): void {
    if (this._view) {
      this._view.webview.html = this._getHtmlForWebview();
    }
  }
  
  private _getHtmlForWebview(): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>AI Models</title>
        <style>
          body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            padding: 10px;
            margin: 0;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
          }
          h3 {
            margin: 0;
          }
          .refresh-button {
            background-color: transparent;
            border: none;
            color: var(--vscode-button-foreground);
            cursor: pointer;
            font-size: 1.2em;
          }
          .current-model {
            padding: 10px;
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            border-radius: 6px;
            margin-bottom: 16px;
          }
          .model-name {
            font-weight: bold;
            margin-bottom: 4px;
          }
          .model-details {
            font-size: 0.9em;
            color: var(--vscode-descriptionForeground);
          }
          .models-list {
            margin-top: 16px;
          }
          .model-item {
            padding: 8px;
            border-radius: 4px;
            margin-bottom: 8px;
            background-color: var(--vscode-sideBar-background);
          }
          .switch-button {
            display: block;
            width: 100%;
            padding: 8px;
            margin-top: 16px;
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 4px;
            cursor: pointer;
            text-align: center;
          }
          .switch-button:hover {
            background-color: var(--vscode-button-hoverBackground);
          }
          .status {
            padding: 8px;
            text-align: center;
            font-style: italic;
            color: var(--vscode-descriptionForeground);
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h3>AI Models</h3>
          <button class="refresh-button" id="refresh-button">🔄</button>
        </div>
        
        ${this._currentModel ? `
          <div class="current-model">
            <div class="model-name">Current: ${this._currentModel.name}</div>
            <div class="model-details">
              Provider: ${this._currentModel.provider}<br>
              Context: ${this._currentModel.context_length} tokens
            </div>
          </div>
        ` : ''}
        
        <div id="models-container">
          <div class="status">Loading models...</div>
        </div>
        
        <button class="switch-button" id="switch-button">Switch Model</button>
        
        <script>
          const vscode = acquireVsCodeApi();
          const modelsContainer = document.getElementById('models-container');
          const refreshButton = document.getElementById('refresh-button');
          const switchButton = document.getElementById('switch-button');
          
          // Refresh models
          refreshButton.addEventListener('click', () => {
            vscode.postMessage({ type: 'refreshModels' });
            modelsContainer.innerHTML = '<div class="status">Loading models...</div>';
          });
          
          // Switch model
          switchButton.addEventListener('click', () => {
            vscode.postMessage({ type: 'switchModel' });
          });
          
          // Handle messages from extension
          window.addEventListener('message', (event) => {
            const message = event.data;
            
            if (message.type === 'modelsLoaded') {
              if (message.error) {
                modelsContainer.innerHTML = \`<div class="status">\${message.error}</div>\`;
                return;
              }
              
              if (message.models.length === 0) {
                modelsContainer.innerHTML = '<div class="status">No models available.</div>';
                return;
              }
              
              const modelsHtml = message.models
                .filter(model => model.is_active)
                .map(model => {
                  const isCurrentModel = message.currentModel && model.id === message.currentModel.id;
                  return \`
                    <div class="model-item \${isCurrentModel ? 'current-model' : ''}">
                      <div class="model-name">\${model.name} \${model.is_default ? '(Default)' : ''}</div>
                      <div class="model-details">
                        Provider: \${model.provider}<br>
                        Context: \${model.context_length} tokens<br>
                        Capabilities: \${model.capabilities.join(', ')}
                      </div>
                    </div>
                  \`;
                })
                .join('');
              
              modelsContainer.innerHTML = \`
                <div class="models-list">
                  \${modelsHtml}
                </div>
              \`;
            }
          });
          
          // Initial load
          vscode.postMessage({ type: 'refreshModels' });
        </script>
      </body>
      </html>
    `;
  }
}

class SettingsViewProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;
  
  constructor(private readonly _extensionUri: vscode.Uri) {}
  
  resolveWebviewView(webviewView: vscode.WebviewView): void {
    this._view = webviewView;
    
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri]
    };
    
    this._updateWebview();
    
    webviewView.webview.onDidReceiveMessage(async (data) => {
      if (data.type === 'updateSetting') {
        await this._updateSetting(data.key, data.value);
      } else if (data.type === 'openSettings') {
        vscode.commands.executeCommand('workbench.action.openSettings', 'enterprise-ai-coding-assistant');
      }
    });
  }
  
  private async _updateSetting(key: string, value: any): Promise<void> {
    try {
      const config = vscode.workspace.getConfiguration('enterprise-ai-coding-assistant');
      await config.update(key, value, vscode.ConfigurationTarget.Global);
      
      // Special handling for inline suggestions
      if (key === 'inlineSuggestions') {
        vscode.window.showInformationMessage(
          `Inline suggestions ${value ? 'enabled' : 'disabled'}. Please reload the window for changes to take effect.`,
          'Reload Window'
        ).then(selection => {
          if (selection === 'Reload Window') {
            vscode.commands.executeCommand('workbench.action.reloadWindow');
          }
        });
      }
    } catch (error) {
      console.error('Failed to update setting:', error);
      vscode.window.showErrorMessage('Failed to update setting.');
    }
  }
  
  private _updateWebview(): void {
    if (this._view) {
      this._view.webview.html = this._getHtmlForWebview();
    }
  }
  
  private _getHtmlForWebview(): string {
    const config = vscode.workspace.getConfiguration('enterprise-ai-coding-assistant');
    
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>AI Coding Assistant Settings</title>
        <style>
          body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            padding: 10px;
            margin: 0;
          }
          h3 {
            margin-top: 0;
            margin-bottom: 16px;
          }
          .setting-group {
            margin-bottom: 20px;
          }
          .setting-item {
            margin-bottom: 12px;
          }
          .setting-label {
            display: block;
            margin-bottom: 4px;
            font-weight: bold;
          }
          .setting-description {
            font-size: 0.9em;
            color: var(--vscode-descriptionForeground);
            margin-bottom: 4px;
          }
          input[type="text"], input[type="number"] {
            width: 100%;
            padding: 6px;
            box-sizing: border-box;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
          }
          input[type="checkbox"] {
            margin-right: 8px;
          }
          .checkbox-container {
            display: flex;
            align-items: center;
          }
          .open-settings-button {
            display: block;
            width: 100%;
            padding: 8px;
            margin-top: 16px;
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 4px;
            cursor: pointer;
            text-align: center;
          }
          .open-settings-button:hover {
            background-color: var(--vscode-button-hoverBackground);
          }
        </style>
      </head>
      <body>
        <h3>AI Coding Assistant Settings</h3>
        
        <div class="setting-group">
          <h4>Server Configuration</h4>
          
          <div class="setting-item">
            <label class="setting-label" for="server-url">LLM Server URL</label>
            <div class="setting-description">URL of the AI Coding Assistant server</div>
            <input type="text" id="server-url" value="${config.get('serverUrl') || ''}">
          </div>
          
          <div class="setting-item">
            <label class="setting-label" for="auth-url">Auth Server URL</label>
            <div class="setting-description">URL of the authentication server</div>
            <input type="text" id="auth-url" value="${config.get('authUrl') || ''}">
          </div>
          
          <div class="setting-item">
            <label class="setting-label" for="model-manager-url">Model Manager URL</label>
            <div class="setting-description">URL of the model manager server</div>
            <input type="text" id="model-manager-url" value="${config.get('modelManagerUrl') || ''}">
          </div>
        </div>
        
        <div class="setting-group">
          <h4>Code Completion</h4>
          
          <div class="setting-item">
            <div class="checkbox-container">
              <input type="checkbox" id="inline-suggestions" ${config.get('inlineSuggestions') ? 'checked' : ''}>
              <label for="inline-suggestions">Enable inline suggestions</label>
            </div>
            <div class="setting-description">Show code suggestions as you type</div>
          </div>
          
          <div class="setting-item">
            <label class="setting-label" for="suggestion-delay">Suggestion Delay (ms)</label>
            <div class="setting-description">Delay before showing suggestions</div>
            <input type="number" id="suggestion-delay" value="${config.get('suggestionDelay') || 500}" min="0" max="5000">
          </div>
          
          <div class="setting-item">
            <label class="setting-label" for="max-tokens">Max Tokens</label>
            <div class="setting-description">Maximum number of tokens to generate</div>
            <input type="number" id="max-tokens" value="${config.get('maxTokens') || 256}" min="1" max="2048">
          </div>
          
          <div class="setting-item">
            <label class="setting-label" for="temperature">Temperature</label>
            <div class="setting-description">Temperature for generation (0.0-1.0)</div>
            <input type="number" id="temperature" value="${config.get('temperature') || 0.2}" min="0" max="1" step="0.1">
          </div>
        </div>
        
        <button class="open-settings-button" id="open-settings-button">Open Full Settings</button>
        
        <script>
          const vscode = acquireVsCodeApi();
          
          // Server URL
          const serverUrlInput = document.getElementById('server-url');
          serverUrlInput.addEventListener('change', () => {
            vscode.postMessage({ 
              type: 'updateSetting', 
              key: 'serverUrl', 
              value: serverUrlInput.value 
            });
          });
          
          // Auth URL
          const authUrlInput = document.getElementById('auth-url');
          authUrlInput.addEventListener('change', () => {
            vscode.postMessage({ 
              type: 'updateSetting', 
              key: 'authUrl', 
              value: authUrlInput.value 
            });
          });
          
          // Model Manager URL
          const modelManagerUrlInput = document.getElementById('model-manager-url');
          modelManagerUrlInput.addEventListener('change', () => {
            vscode.postMessage({ 
              type: 'updateSetting', 
              key: 'modelManagerUrl', 
              value: modelManagerUrlInput.value 
            });
          });
          
          // Inline suggestions
          const inlineSuggestionsInput = document.getElementById('inline-suggestions');
          inlineSuggestionsInput.addEventListener('change', () => {
            vscode.postMessage({ 
              type: 'updateSetting', 
              key: 'inlineSuggestions', 
              value: inlineSuggestionsInput.checked 
            });
          });
          
          // Suggestion delay
          const suggestionDelayInput = document.getElementById('suggestion-delay');
          suggestionDelayInput.addEventListener('change', () => {
            vscode.postMessage({ 
              type: 'updateSetting', 
              key: 'suggestionDelay', 
              value: parseInt(suggestionDelayInput.value, 10) 
            });
          });
          
          // Max tokens
          const maxTokensInput = document.getElementById('max-tokens');
          maxTokensInput.addEventListener('change', () => {
            vscode.postMessage({ 
              type: 'updateSetting', 
              key: 'maxTokens', 
              value: parseInt(maxTokensInput.value, 10) 
            });
          });
          
          // Temperature
          const temperatureInput = document.getElementById('temperature');
          temperatureInput.addEventListener('change', () => {
            vscode.postMessage({ 
              type: 'updateSetting', 
              key: 'temperature', 
              value: parseFloat(temperatureInput.value) 
            });
          });
          
          // Open settings
          const openSettingsButton = document.getElementById('open-settings-button');
          openSettingsButton.addEventListener('click', () => {
            vscode.postMessage({ type: 'openSettings' });
          });
        </script>
      </body>
      </html>
    `;
  }
}

export function deactivate() {
  // Clean up resources
  if (completionProvider) {
    completionProvider.dispose();
  }
}