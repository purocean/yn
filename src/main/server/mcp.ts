import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
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
 * Create MCP server
 */
function createMCPServer () {
  const server = new Server(
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
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'yn_list_actions',
          description: 'List all available YankNote actions that can be executed',
          inputSchema: {
            type: 'object',
            properties: {},
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
          },
        },
      ],
    }
  })

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params

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
      const { actionName, args: actionArgs = [] } = args as any

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
  })

  return server
}

/**
 * Handle MCP SSE requests
 */
export async function handleMCPRequest (
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  // Check if MCP is enabled
  const mcpEnabled = config.get('mcp.enabled', false)
  if (!mcpEnabled) {
    res.writeHead(403, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'MCP server is not enabled' }))
    return
  }

  try {
    const server = createMCPServer()
    const transport = new SSEServerTransport('/api/mcp/message', res)
    await server.connect(transport)

    req.on('close', async () => {
      await server.close()
    })
  } catch (error: any) {
    console.error('[MCP] Request error:', error)
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: error.message }))
    }
  }
}
