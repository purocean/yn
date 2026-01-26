import type { IncomingMessage, ServerResponse } from 'http'
import config from '../config'

interface Action {
  name: string
  description?: string
  mcpDescription?: string
  forUser?: boolean
}

let actionsCache: Action[] = []
let executeActionCallback: ((name: string, args: any[]) => Promise<any>) | null = null

/**
 * Register actions from frontend
 */
export function registerActions (actions: Action[]) {
  actionsCache = actions.filter(a => a.forUser)
  console.log('[MCP] Registered actions:', actionsCache.length)
}

/**
 * Set execute action callback
 */
export function setExecuteActionCallback (callback: (name: string, args: any[]) => Promise<any>) {
  executeActionCallback = callback
}

/**
 * List available tools
 */
function listTools () {
  return {
    tools: [
      {
        name: 'yn_list_actions',
        description: 'List all available YankNote actions that can be executed',
        inputSchema: {
          type: 'object',
          properties: {},
          additionalProperties: false,
        },
      },
      {
        name: 'yn_execute_action',
        description: 'Execute a YankNote action by name with optional arguments',
        inputSchema: {
          type: 'object',
          properties: {
            actionName: {
              type: 'string',
              description: 'Name of the action to execute',
            },
            args: {
              type: 'array',
              description: 'Optional arguments to pass to the action',
              items: {},
            },
          },
          required: ['actionName'],
          additionalProperties: false,
        },
      },
    ],
  }
}

/**
 * Call a tool
 */
async function callTool (name: string, args: any) {
  if (name === 'yn_list_actions') {
    const actionList = actionsCache.map((action) => ({
      name: action.name,
      description: action.description || '',
      mcpDescription: action.mcpDescription || '',
    }))

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(actionList, null, 2),
        },
      ],
    }
  }

  if (name === 'yn_execute_action') {
    const { actionName, args: actionArgs = [] } = args

    try {
      if (!executeActionCallback) {
        throw new Error('Execute action callback not set')
      }

      const result = await executeActionCallback(actionName, actionArgs)

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ success: true, result }),
          },
        ],
      }
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ success: false, error: error.message }),
          },
        ],
        isError: true,
      }
    }
  }

  throw new Error(`Unknown tool: ${name}`)
}

/**
 * Handle MCP JSON-RPC request
 */
export async function handleMCPRequest (
  req: IncomingMessage,
  res: ServerResponse,
  body: any
): Promise<void> {
  // Check if MCP is enabled
  const mcpEnabled = config.get('mcp.enabled', false)
  if (!mcpEnabled) {
    res.writeHead(403, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ jsonrpc: '2.0', error: { code: -32600, message: 'MCP server is not enabled' }, id: body.id }))
    return
  }

  try {
    const { method, params, id } = body

    let result

    if (method === 'tools/list') {
      result = listTools()
    } else if (method === 'tools/call') {
      const { name, arguments: args } = params
      result = await callTool(name, args || {})
    } else if (method === 'initialize') {
      result = {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {},
        },
        serverInfo: {
          name: 'yn-mcp-server',
          version: '1.0.0',
        },
      }
    } else {
      throw new Error(`Unknown method: ${method}`)
    }

    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({
      jsonrpc: '2.0',
      result,
      id,
    }))
  } catch (error: any) {
    console.error('[MCP] Request error:', error)
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({
      jsonrpc: '2.0',
      error: {
        code: -32603,
        message: error.message,
      },
      id: body.id,
    }))
  }
}
