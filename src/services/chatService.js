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
 * Base system prompt for the workforce tracker assistant
 */
const BASE_SYSTEM_PROMPT = `You are an AI assistant for the P3 Workforce Tracker application. You help users with:

- Understanding workforce data and employee information
- Analyzing department distributions and costs
- Explaining reports and metrics
- Guiding users through the application features
- Answering questions about HR data management
- Providing insights about workforce planning

Be helpful, concise, and professional. Format your responses using markdown when appropriate for better readability.

IMPORTANT: When answering questions about the data, use the ACTUAL DATA provided in the context below. Do not say you don't have access to the data - you DO have access to the aggregated statistics.`;

/**
 * Generate system prompt with data context
 * @param {Object} dataContext - Aggregated workforce data
 * @returns {string} - Complete system prompt with data
 */
export function generateSystemPrompt(dataContext = null) {
  if (!dataContext || !dataContext.totalEmployees) {
    return BASE_SYSTEM_PROMPT + `

NOTE: No workforce data is currently loaded. Guide the user to import data using the Import function.`;
  }

  const dataSection = `

=== CURRENT WORKFORCE DATA ===

OVERVIEW:
- Total Employees: ${dataContext.totalEmployees.toLocaleString()}
- Total FTE: ${dataContext.totalFTE?.toLocaleString() || 'N/A'}
- Total Annual Salary: €${dataContext.totalSalary?.toLocaleString() || 'N/A'}
- Employees in Reduction Programs: ${dataContext.employeesWithReduction || 0}
- Number of Departments: ${Object.keys(dataContext.departmentDetails || {}).length}

DEPARTMENT BREAKDOWN:
${Object.entries(dataContext.departmentDetails || {})
  .sort((a, b) => b[1].count - a[1].count)
  .slice(0, 15)
  .map(([name, data]) => `- ${name}: ${data.count} employees, ${data.totalFTE?.toFixed(0) || 'N/A'} FTE, €${data.totalSalary?.toLocaleString() || 'N/A'} total salary`)
  .join('\n')}

${Object.keys(dataContext.departmentDetails || {}).length > 15 ? `... and ${Object.keys(dataContext.departmentDetails).length - 15} more departments` : ''}

COST CENTERS (Top 10):
${Object.entries(dataContext.costCenterCounts || {})
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10)
  .map(([name, count]) => `- ${name}: ${count} employees`)
  .join('\n') || 'No cost center data available'}

LOCATIONS (Top 10):
${Object.entries(dataContext.locationCounts || {})
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10)
  .map(([name, count]) => `- ${name}: ${count} employees`)
  .join('\n') || 'No location data available'}

EMPLOYEE STATUS:
${Object.entries(dataContext.statusCounts || {})
  .map(([status, count]) => `- ${status}: ${count} employees`)
  .join('\n') || 'No status data available'}

KEY METRICS:
- Average Salary: €${dataContext.totalEmployees > 0 ? Math.round(dataContext.totalSalary / dataContext.totalEmployees).toLocaleString() : 'N/A'} per employee
- Average FTE: ${dataContext.totalEmployees > 0 ? (dataContext.totalFTE / dataContext.totalEmployees * 100).toFixed(1) : 'N/A'}%
- Reduction Rate: ${dataContext.totalEmployees > 0 ? ((dataContext.employeesWithReduction / dataContext.totalEmployees) * 100).toFixed(1) : 0}%

=== END OF DATA ===

Use this data to answer user questions accurately. When users ask about specific departments, costs, or metrics, refer to the actual numbers above.`;

  return BASE_SYSTEM_PROMPT + dataSection;
}

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
    dataContext = null,
  } = options;

  // Generate system prompt with data context
  const systemPrompt = generateSystemPrompt(dataContext);

  // Prepend system message if not already present
  const messagesWithSystem = messages[0]?.role === 'system'
    ? messages
    : [{ role: 'system', content: systemPrompt }, ...messages];

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
    dataContext = null,
  } = options;

  // Generate system prompt with data context
  const systemPrompt = generateSystemPrompt(dataContext);

  const messagesWithSystem = messages[0]?.role === 'system'
    ? messages
    : [{ role: 'system', content: systemPrompt }, ...messages];

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
 * Create a chat session with history management and data context
 */
export class ChatSession {
  constructor(dataContext = null) {
    this.messages = [];
    this.dataContext = dataContext;
  }

  setDataContext(dataContext) {
    this.dataContext = dataContext;
  }

  async send(userMessage, options = {}) {
    this.messages.push({ role: 'user', content: userMessage });

    try {
      const response = await sendMessage(this.messages, {
        ...options,
        dataContext: this.dataContext,
      });
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
      const response = await sendMessageStream(this.messages, onChunk, {
        ...options,
        dataContext: this.dataContext,
      });
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
  generateSystemPrompt,
};
