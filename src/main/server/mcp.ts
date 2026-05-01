import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import type { IncomingMessage, ServerResponse } from 'http'
import config from '../config'
import { jsonRPCClient } from '../jsonrpc'
import { exportDocumentForMcp } from '../mcp-export'

interface Action {
  name: string
  description?: string
  mcpDescription?: string
  forUser?: boolean
  forMcp?: boolean
}

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
 * Create MCP server for a single stateless HTTP request.
 */
function createMCPServer (): Server {
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
        {
          name: 'yn_export_document',
          description: 'Export a Yank Note document by repo/path or absolutePath. Use fromType "html" to export the rendered preview with extensions applied. Returns base64 content unless outputPath is provided.',
          inputSchema: {
            type: 'object',
            properties: {
              repo: {
                type: 'string',
                description: 'Repository name. Use together with path for repository documents.',
              },
              path: {
                type: 'string',
                description: 'Document path inside the repository. Use together with repo.',
              },
              absolutePath: {
                type: 'string',
                description: 'Absolute markdown file path. Use this for files outside configured repositories.',
              },
              options: {
                type: 'object',
                description: 'Export options. For most use cases, set fromType to "html" so rendered diagrams, math, and preview plugins are included.',
                properties: {
                  fromType: {
                    type: 'string',
                    enum: ['markdown', 'html'],
                    description: '"html" exports the rendered preview. "markdown" exports the raw markdown source and only works for pandoc-based formats, not PDF.',
                  },
                  toType: {
                    type: 'string',
                    enum: ['docx', 'html', 'rst', 'adoc', 'pdf'],
                    description: 'Target format. pdf uses Electron printToPDF. docx/rst/adoc use the pandoc conversion pipeline. html exports a standalone HTML document.',
                  },
                  fromHtmlOptions: {
                    type: 'object',
                    description: 'Options used when fromType is "html". These control how the rendered preview is serialized before export.',
                    properties: {
                      inlineLocalImage: {
                        type: 'boolean',
                        description: 'Inline local images as data URLs in exported HTML. Usually true for portable HTML exports.',
                        default: true,
                      },
                      uploadLocalImage: {
                        type: 'boolean',
                        description: 'Upload local images through the configured image hosting plugin before export. Do not enable together with inlineLocalImage.',
                        default: false,
                      },
                      inlineStyle: {
                        type: 'boolean',
                        description: 'Inline computed CSS styles into exported HTML nodes. Mutually exclusive with includeStyle.',
                        default: false,
                      },
                      includeStyle: {
                        type: 'boolean',
                        description: 'Include Yank Note preview CSS in the exported HTML. Mutually exclusive with inlineStyle. Required for visible code copy buttons.',
                        default: true,
                      },
                      highlightCode: {
                        type: 'boolean',
                        description: 'Apply syntax highlighting to code blocks during HTML export.',
                        default: true,
                      },
                      codeLineNumbers: {
                        type: 'boolean',
                        description: 'Render line numbers for code blocks in exported HTML.',
                        default: true,
                      },
                      codeCopyButton: {
                        type: 'boolean',
                        description: 'Render copy buttons for code blocks in exported HTML. This only takes effect when includeStyle or inlineStyle is enabled.',
                        default: true,
                      },
                      includeToc: {
                        type: 'array',
                        description: 'Heading levels to include in the exported table of contents. Use [] to disable TOC, or values such as [1,2,3].',
                        items: {
                          type: 'number',
                          minimum: 1,
                          maximum: 6,
                        },
                        default: [],
                      },
                    },
                    additionalProperties: true,
                  },
                  pdfOptions: {
                    type: 'object',
                    description: 'Electron printToPDF options. Only used when toType is "pdf". Common options are listed here; extra Electron-supported options are also accepted.',
                    properties: {
                      landscape: {
                        type: 'boolean',
                        description: 'Print in landscape orientation.',
                        default: false,
                      },
                      pageSize: {
                        anyOf: [
                          {
                            type: 'string',
                            enum: ['A3', 'A4', 'A5', 'Legal', 'Letter', 'Tabloid'],
                          },
                          {
                            type: 'object',
                            properties: {
                              width: {
                                type: 'number',
                                description: 'Page width in microns.',
                              },
                              height: {
                                type: 'number',
                                description: 'Page height in microns.',
                              },
                            },
                            required: ['width', 'height'],
                            additionalProperties: false,
                          },
                        ],
                        description: 'PDF page size. Use a named paper size such as "A4", or an object with width/height in microns.',
                        default: 'A4',
                      },
                      scale: {
                        type: 'number',
                        minimum: 0.1,
                        maximum: 2,
                        description: 'Scale factor for the page. 1 means 100%.',
                        default: 1,
                      },
                      printBackground: {
                        type: 'boolean',
                        description: 'Whether to print CSS backgrounds.',
                        default: true,
                      },
                      margins: {
                        type: 'object',
                        description: 'PDF margins in inches.',
                        properties: {
                          top: { type: 'number' },
                          bottom: { type: 'number' },
                          left: { type: 'number' },
                          right: { type: 'number' },
                        },
                        additionalProperties: false,
                      },
                      pageRanges: {
                        type: 'string',
                        description: 'Page ranges to print, for example "1-3,5".',
                      },
                      displayHeaderFooter: {
                        type: 'boolean',
                        description: 'Whether to show header and footer.',
                        default: false,
                      },
                      headerTemplate: {
                        type: 'string',
                        description: 'HTML template for the print header. Used when displayHeaderFooter is true.',
                      },
                      footerTemplate: {
                        type: 'string',
                        description: 'HTML template for the print footer. Used when displayHeaderFooter is true.',
                      },
                      preferCSSPageSize: {
                        type: 'boolean',
                        description: 'Give CSS @page size priority over pageSize.',
                        default: false,
                      },
                      generateTaggedPDF: {
                        type: 'boolean',
                        description: 'Generate tagged, accessible PDF output when supported by Electron.',
                      },
                      generateDocumentOutline: {
                        type: 'boolean',
                        description: 'Generate PDF document outline/bookmarks when supported by Electron.',
                        default: true,
                      },
                    },
                    additionalProperties: true,
                  },
                },
                required: ['fromType', 'toType'],
                additionalProperties: true,
              },
              outputPath: {
                type: 'string',
                description: 'Optional absolute output path. When provided, the exported file is written there and base64 is omitted from the result.',
              },
              renderTimeout: {
                type: 'number',
                description: 'Optional timeout in milliseconds for waiting for preview rendering and the export bridge. Default: 20000.',
                default: 20000,
              },
              imageTimeout: {
                type: 'number',
                description: 'Deprecated alias for resourceTimeout. Optional timeout in milliseconds for waiting for preview images.',
              },
              resourceTimeout: {
                type: 'number',
                description: 'Optional timeout in milliseconds for waiting for preview images and iframes. Default: 60000.',
                default: 60000,
              },
            },
            required: ['options'],
            anyOf: [
              { required: ['absolutePath'] },
              { required: ['repo', 'path'] },
            ],
            additionalProperties: false,
            examples: [
              {
                absolutePath: '/Users/me/docs/readme.md',
                options: {
                  fromType: 'html',
                  toType: 'pdf',
                  fromHtmlOptions: {
                    includeStyle: true,
                    highlightCode: true,
                    codeLineNumbers: true,
                  },
                  pdfOptions: {
                    pageSize: 'A4',
                    printBackground: true,
                    scale: 1,
                  },
                },
                outputPath: '/tmp/readme.pdf',
              },
              {
                repo: 'main',
                path: 'docs/readme.md',
                options: {
                  fromType: 'html',
                  toType: 'docx',
                  fromHtmlOptions: {
                    inlineLocalImage: true,
                    includeStyle: true,
                  },
                },
              },
            ],
          },
        },
      ],
    }
  })

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
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

    if (name === 'yn_export_document') {
      try {
        const result = await exportDocumentForMcp(args as any)

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
    const server = createMCPServer()
    const transport = new StreamableHTTPServerTransport()

    await server.connect(transport)
    await transport.handleRequest(req, res, parsedBody)
  } catch (error: any) {
    console.error('[MCP] Request error:', error)
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: error.message }))
    }
  }
}
