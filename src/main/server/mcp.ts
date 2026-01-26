import type { IncomingMessage, ServerResponse } from 'http'
import config from '../config'
import { jsonRPCClient } from '../jsonrpc'

interface Action {
  name: string
  description?: string
  mcpDescription?: string
  forUser?: boolean
}

/**
 * Get actions from frontend via jsonRPCClient
 */
async function getActions (): Promise<Action[]> {
  try {
    const actions = await jsonRPCClient.call.ctx.action.getRawActions()
    return actions.filter((a: Action) => a.forUser)
  } catch (error) {
    console.error('[MCP] Failed to get actions from frontend:', error)
    return []
  }
}

/**
 * Execute action in frontend via jsonRPCClient
 */
async function executeAction (actionName: string, args: any[]): Promise<any> {
  const handler = await jsonRPCClient.call.ctx.action.getActionHandler(actionName)
  return await handler(...args)
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
    const actions = await getActions()
    const actionList = actions.map((action) => ({
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
      const result = await executeAction(actionName, actionArgs)

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
