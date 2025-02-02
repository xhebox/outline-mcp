#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { z } from "zod";
import { ofetch } from "ofetch";

// args
const args = process.argv.slice(2)
if (args.length !== 2) {
  console.error(`Usage: ${process.argv[1]} server token`)
  process.exit(1)
}

const serverAddr = args[0]
const serverToken = args[1]
const serverFetch = ofetch.create({
	baseURL: `${serverAddr}`,
	headers: {
		Authorization: `Bearer ${serverToken}`,
		'Content-Type': 'application/json'
	},
});

const server = new McpServer(
  {
    name: "outline-mcp",
    version: "1.0.0",
  }
)

server.tool("add",
  { a: z.number(), b: z.number() },
  async ({ a, b }) => ({
    content: [{ type: "text", text: String(a + b) }]
  })
)

server.tool("search",
	{
		query: z.string().describe("search query"),
		offset: z.number().describe("pagination offset").default(1),
		limit: z.number().describe("max pagination limit").default(10),
	},
	async ({ query, offset, limit }) => {
		const {data} = await serverFetch('/api/documents.search', {
			method: 'POST',
			body: {
				offset,
				limit,
				query,
			},
		})
		return {
			content: [
				{ type: "text", text: JSON.stringify(data) }
			]
		}
	},
);

server.tool("read",
	{
		ids: z.array(z.string().describe("document id")),
	},
	async ({ ids }) => {
		const docs = await Promise.all(ids.map(async id => {
			const {data} = await serverFetch('/api/documents.info', {
				method: 'POST',
				body: {
					id,
				},
			})
			return data
		}))
		return {
			content: [
				{ type: "text", text: JSON.stringify(docs) }
			]
		}
	},
);

// main
(async function() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error("Server running on stdio")
  console.error("Addr:", serverAddr)
  console.error("Token:", serverToken)
})().catch(error => {
  console.error("Fatal error running server:", error)
  process.exit(1)
})
