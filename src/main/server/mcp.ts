import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import type { IncomingMessage, ServerResponse } from 'http'
import config from '../config'
import { jsonRPCClient } from '../jsonrpc'

interface Action {
  name: string
  description?: string
  mcpDescription?: string
  forUser?: boolean
  forMcp?: boolean
}

let mcpServer: Server | null = null
let mcpTransport: StreamableHTTPServerTransport | null = null

/**
 * Get actions from frontend via jsonRPCClient
 */
async function getActions (): Promise<Action[]> {
  try {
    const actions = await jsonRPCClient.call.ctx.action.getRawActions()
    return actions.filter((a: Action) => a.forMcp)
  } catch (error) {
    console.error('[MCP] Failed to get actions from frontend:', error)
    return []
  }
}

/**
 * Execute action in frontend via jsonRPCClient
 */
async function executeAction (actionName: string, args: any[]): Promise<any> {
  return await jsonRPCClient.call.ctx.action.executeAction(actionName, ...args)
}

/**
 * Initialize MCP server and transport
 */
function initMCPServer (): void {
  if (mcpServer && mcpTransport) {
    return
  }

  // Create server
  mcpServer = new Server(
    {
      name: 'yn-mcp-server',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  )

  // List available tools
  mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
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
  })

  // Handle tool calls
  mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params

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
      const { actionName, args: actionArgs = [] } = args as any

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
  })

  // Create transport
  mcpTransport = new StreamableHTTPServerTransport()

  // Connect server to transport
  mcpServer.connect(mcpTransport).catch((error) => {
    console.error('[MCP] Failed to connect server to transport:', error)
  })
}

/**
 * Handle MCP HTTP request
 */
export async function handleMCPRequest (
  req: IncomingMessage,
  res: ServerResponse,
  parsedBody?: any
): Promise<void> {
  // Check if MCP is enabled
  const mcpEnabled = config.get('mcp.enabled', false)
  if (!mcpEnabled) {
    res.writeHead(403, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'MCP server is not enabled' }))
    return
  }

  try {
    // Initialize server if needed
    if (!mcpServer || !mcpTransport) {
      initMCPServer()
    }

    // Handle the request using the transport with parsed body
    await mcpTransport!.handleRequest(req, res, parsedBody)
  } catch (error: any) {
    console.error('[MCP] Request error:', error)
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: error.message }))
    }
  }
}
