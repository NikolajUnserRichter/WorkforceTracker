/**
 * Azure OpenAI Chat Service
 * Handles communication with Azure OpenAI GPT-4.1-mini endpoint
 *
 * Required environment variables:
 * - VITE_AZURE_OPENAI_ENDPOINT: The Azure OpenAI endpoint URL
 * - VITE_AZURE_OPENAI_KEY: The API key for authentication
 */

const AZURE_ENDPOINT = import.meta.env.VITE_AZURE_OPENAI_ENDPOINT;
const API_KEY = import.meta.env.VITE_AZURE_OPENAI_KEY;

/**
 * System prompt for the workforce tracker assistant
 */
const SYSTEM_PROMPT = `You are an AI assistant for the P3 Workforce Tracker application. You help users with:

- Understanding workforce data and employee information
- Analyzing department distributions and costs
- Explaining reports and metrics
- Guiding users through the application features
- Answering questions about HR data management
- Providing insights about workforce planning

Be helpful, concise, and professional. When discussing data, remind users that you don't have direct access to their database but can help them understand how to use the application features.

Format your responses using markdown when appropriate for better readability.`;

/**
 * Send a message to Azure OpenAI and get a response
 * @param {Array} messages - Array of message objects with role and content
 * @param {Object} options - Optional configuration
 * @returns {Promise<string>} - The assistant's response
 */
export async function sendMessage(messages, options = {}) {
  const {
    temperature = 0.7,
    maxTokens = 1024,
    stream = false,
  } = options;

  // Prepend system message if not already present
  const messagesWithSystem = messages[0]?.role === 'system'
    ? messages
    : [{ role: 'system', content: SYSTEM_PROMPT }, ...messages];

  try {
    const response = await fetch(AZURE_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': API_KEY,
      },
      body: JSON.stringify({
        messages: messagesWithSystem,
        temperature,
        max_tokens: maxTokens,
        stream,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[ChatService] API error:', response.status, errorText);
      throw new Error(`API request failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    if (!data.choices || data.choices.length === 0) {
      throw new Error('No response from AI');
    }

    return data.choices[0].message.content;
  } catch (error) {
    console.error('[ChatService] Error:', error);
    throw error;
  }
}

/**
 * Send a message with streaming response
 * @param {Array} messages - Array of message objects
 * @param {Function} onChunk - Callback for each chunk of text
 * @param {Object} options - Optional configuration
 * @returns {Promise<string>} - The complete response
 */
export async function sendMessageStream(messages, onChunk, options = {}) {
  const {
    temperature = 0.7,
    maxTokens = 1024,
  } = options;

  const messagesWithSystem = messages[0]?.role === 'system'
    ? messages
    : [{ role: 'system', content: SYSTEM_PROMPT }, ...messages];

  try {
    const response = await fetch(AZURE_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': API_KEY,
      },
      body: JSON.stringify({
        messages: messagesWithSystem,
        temperature,
        max_tokens: maxTokens,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status} - ${errorText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(line => line.trim() !== '');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullResponse += content;
              onChunk(content);
            }
          } catch (e) {
            // Skip invalid JSON chunks
          }
        }
      }
    }

    return fullResponse;
  } catch (error) {
    console.error('[ChatService] Stream error:', error);
    throw error;
  }
}

/**
 * Create a chat session with history management
 */
export class ChatSession {
  constructor() {
    this.messages = [];
  }

  async send(userMessage, options = {}) {
    this.messages.push({ role: 'user', content: userMessage });

    try {
      const response = await sendMessage(this.messages, options);
      this.messages.push({ role: 'assistant', content: response });
      return response;
    } catch (error) {
      // Remove the user message if the request failed
      this.messages.pop();
      throw error;
    }
  }

  async sendStream(userMessage, onChunk, options = {}) {
    this.messages.push({ role: 'user', content: userMessage });

    try {
      const response = await sendMessageStream(this.messages, onChunk, options);
      this.messages.push({ role: 'assistant', content: response });
      return response;
    } catch (error) {
      this.messages.pop();
      throw error;
    }
  }

  getHistory() {
    return [...this.messages];
  }

  clearHistory() {
    this.messages = [];
  }
}

export default {
  sendMessage,
  sendMessageStream,
  ChatSession,
};
