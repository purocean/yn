import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  enabled: false,
  serverInstances: [] as any[],
  transportInstances: [] as any[],
  getAction: vi.fn(),
  readFile: vi.fn(),
  exportDocumentForMcp: vi.fn(),
  jsonRPCClient: {
    call: {
      ctx: {
        action: {
          getRawActions: vi.fn(),
          executeAction: vi.fn(),
        },
      },
    },
  },
}))

const ListToolsRequestSchema = Symbol('ListToolsRequestSchema')
const CallToolRequestSchema = Symbol('CallToolRequestSchema')

vi.mock('@modelcontextprotocol/sdk/types.js', () => ({
  ListToolsRequestSchema,
  CallToolRequestSchema,
}))

vi.mock('@modelcontextprotocol/sdk/server/index.js', () => ({
  Server: vi.fn(function Server (this: any, info, options) {
    this.info = info
    this.options = options
    this.handlers = new Map()
    this.setRequestHandler = vi.fn((schema, handler) => {
      this.handlers.set(schema, handler)
    })
    this.connect = vi.fn(async (transport) => {
      this.transport = transport
    })
    mocks.serverInstances.push(this)
  }),
}))

vi.mock('@modelcontextprotocol/sdk/server/streamableHttp.js', () => ({
  StreamableHTTPServerTransport: vi.fn(function StreamableHTTPServerTransport (this: any) {
    this.handleRequest = vi.fn(async () => undefined)
    mocks.transportInstances.push(this)
  }),
}))

vi.mock('fs-extra', () => ({
  readFile: (...args: any[]) => mocks.readFile(...args),
}))

vi.mock('../../config', () => ({
  default: {
    get: vi.fn((key: string, fallback: any) => key === 'mcp.enabled' ? mocks.enabled : fallback),
  },
}))

vi.mock('../../action', () => ({
  getAction: (...args: any[]) => mocks.getAction(...args),
}))

vi.mock('../../constant', () => ({
  HELP_DIR: '/help',
}))

vi.mock('../../jsonrpc', () => ({
  jsonRPCClient: mocks.jsonRPCClient,
}))

vi.mock('../../mcp-export', () => ({
  exportDocumentForMcp: (...args: any[]) => mocks.exportDocumentForMcp(...args),
}))

function createResponse () {
  return {
    headersSent: false,
    status: 0,
    headers: {} as Record<string, string>,
    body: '',
    writeHead: vi.fn(function (this: any, status: number, headers: Record<string, string>) {
      this.status = status
      this.headers = headers
      this.headersSent = true
    }),
    end: vi.fn(function (this: any, body: string) {
      this.body = body
    }),
  }
}

async function initEnabledServer () {
  mocks.enabled = true
  const { handleMCPRequest } = await import('../mcp')
  const req = {} as any
  const res = createResponse()
  const parsedBody = { jsonrpc: '2.0' }

  await handleMCPRequest(req, res as any, parsedBody)

  return { req, res, parsedBody, server: mocks.serverInstances[0], transport: mocks.transportInstances[0] }
}

afterEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
  mocks.enabled = false
  mocks.serverInstances.length = 0
  mocks.transportInstances.length = 0
  mocks.getAction.mockReset()
  mocks.readFile.mockReset()
  mocks.exportDocumentForMcp.mockReset()
  mocks.jsonRPCClient.call.ctx.action.getRawActions.mockReset()
  mocks.jsonRPCClient.call.ctx.action.executeAction.mockReset()
})

describe('MCP server request handling', () => {
  it('returns 403 when the MCP server is disabled', async () => {
    const { handleMCPRequest } = await import('../mcp')
    const res = createResponse()

    await handleMCPRequest({} as any, res as any)

    expect(res.writeHead).toHaveBeenCalledWith(403, { 'Content-Type': 'application/json' })
    expect(JSON.parse(res.body)).toEqual({ error: 'MCP server is not enabled' })
    expect(mocks.serverInstances).toHaveLength(0)
  })

  it('connects a stateless server and delegates the HTTP request to transport', async () => {
    const { req, res, parsedBody, server, transport } = await initEnabledServer()

    expect(server.info).toEqual({ name: 'yn-mcp-server', version: '1.0.0' })
    expect(server.options).toEqual({ capabilities: { tools: {} } })
    expect(server.connect).toHaveBeenCalledWith(transport)
    expect(transport.handleRequest).toHaveBeenCalledWith(req, res, parsedBody)
  })

  it('lists built-in tools and frontend actions', async () => {
    const { server } = await initEnabledServer()
    mocks.jsonRPCClient.call.ctx.action.getRawActions.mockResolvedValue([
      { name: 'visible', description: 'Visible', mcpDescription: 'MCP', forMcp: true },
      { name: 'hidden', forMcp: false },
    ])

    const listTools = await server.handlers.get(ListToolsRequestSchema)()
    const toolNames = listTools.tools.map((tool: any) => tool.name)
    expect(toolNames).toEqual([
      'yn_list_actions',
      'yn_execute_action',
      'yn_get_markdown_features_doc',
      'yn_reload_main_window',
      'yn_export_document',
    ])

    const callTool = server.handlers.get(CallToolRequestSchema)
    const result = await callTool({ params: { name: 'yn_list_actions', arguments: {} } })
    expect(JSON.parse(result.content[0].text)).toEqual([
      { name: 'visible', description: 'Visible', mcpDescription: 'MCP' },
    ])
  })

  it('executes frontend actions and returns action errors as MCP errors', async () => {
    const { server } = await initEnabledServer()
    const callTool = server.handlers.get(CallToolRequestSchema)

    mocks.jsonRPCClient.call.ctx.action.executeAction.mockResolvedValueOnce({ ok: true })
    const success = await callTool({ params: { name: 'yn_execute_action', arguments: { actionName: 'doc.open', args: ['a.md'] } } })
    expect(JSON.parse(success.content[0].text)).toEqual({ success: true, result: { ok: true } })
    expect(mocks.jsonRPCClient.call.ctx.action.executeAction).toHaveBeenCalledWith('doc.open', 'a.md')

    mocks.jsonRPCClient.call.ctx.action.executeAction.mockRejectedValueOnce(new Error('bad action'))
    const failure = await callTool({ params: { name: 'yn_execute_action', arguments: { actionName: 'bad' } } })
    expect(failure.isError).toBe(true)
    expect(JSON.parse(failure.content[0].text)).toEqual({ success: false, error: 'bad action' })
  })

  it('serves markdown docs, reloads the main window, and exports documents', async () => {
    const { server } = await initEnabledServer()
    const callTool = server.handlers.get(CallToolRequestSchema)
    mocks.readFile.mockResolvedValue('# Features')

    const doc = await callTool({ params: { name: 'yn_get_markdown_features_doc', arguments: { language: 'en' } } })
    expect(JSON.parse(doc.content[0].text).result).toEqual({
      language: 'en',
      fileName: 'FEATURES.md',
      content: '# Features',
    })
    expect(mocks.readFile).toHaveBeenCalledWith('/help/FEATURES.md', 'utf-8')

    const actions = new Map<string, any>([
      ['set-url-mode', vi.fn()],
      ['refresh-menus', vi.fn()],
      ['reload-main-window', vi.fn(async () => undefined)],
      ['show-main-window', vi.fn()],
      ['get-url-mode', vi.fn(() => 'dev')],
    ])
    mocks.getAction.mockImplementation((name: string) => actions.get(name))
    const reload = await callTool({ params: { name: 'yn_reload_main_window', arguments: { urlMode: 'dev' } } })
    expect(JSON.parse(reload.content[0].text).result).toEqual({ success: true, urlMode: 'dev' })
    expect(actions.get('set-url-mode')).toHaveBeenCalledWith('dev')

    mocks.exportDocumentForMcp.mockResolvedValue({ base64: 'ZGF0YQ==' })
    const exported = await callTool({ params: { name: 'yn_export_document', arguments: { repo: 'notes', path: 'a.md', options: { fromType: 'html', toType: 'html' } } } })
    expect(JSON.parse(exported.content[0].text)).toEqual({ success: true, result: { base64: 'ZGF0YQ==' } })
  })

  it('handles transport errors and unknown tools', async () => {
    mocks.enabled = true
    const { handleMCPRequest } = await import('../mcp')
    const res = createResponse()
    mocks.transportInstances.push({
      handleRequest: vi.fn(async () => {
        throw new Error('transport failed')
      }),
    })

    // Replace the next created transport behavior after construction.
    vi.mocked((await import('@modelcontextprotocol/sdk/server/streamableHttp.js')).StreamableHTTPServerTransport).mockImplementationOnce(function (this: any) {
      this.handleRequest = vi.fn(async () => {
        throw new Error('transport failed')
      })
      mocks.transportInstances.push(this)
    } as any)

    await handleMCPRequest({} as any, res as any)
    expect(res.writeHead).toHaveBeenCalledWith(500, { 'Content-Type': 'application/json' })
    expect(JSON.parse(res.body)).toEqual({ error: 'transport failed' })

    const { server } = await initEnabledServer()
    await expect(server.handlers.get(CallToolRequestSchema)({ params: { name: 'missing', arguments: {} } })).rejects.toThrow('Unknown tool: missing')
  })
})
