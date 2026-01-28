---
spec_version: "1.0"
feature: "web-search-mcp"
level: 2
status: "active"
created: "2026-01-28"
updated: "2026-01-28"
tags: ["mcp", "web-search", "api-integration"]
---

<!-- @SECTION:OVERVIEW -->
# Web Search MCP Transformation

Transform the existing AI Search MCP server from SearchAPI.io integration to Claude API web search integration. The server will provide two tools: web-search (using Claude API) and web-fetch (existing HTML-to-Markdown conversion).
<!-- @END:OVERVIEW -->

<!-- @SECTION:USER_STORIES -->
## User Stories

<!-- @STORY:US-001 priority=P1 status=done mvp=true -->
### US-001: Web Search via Claude API (P1) 🎯 MVP

As an AI assistant user, I want to search the web using natural language queries so that I can retrieve relevant information from the internet.

**Independent Test**: Call web-search tool with a query and verify it returns search results from Claude API endpoint.
<!-- @END:STORY:US-001 -->

<!-- @STORY:US-002 priority=P1 status=done mvp=true -->
### US-002: Web Content Fetching (P1) 🎯 MVP

As an AI assistant user, I want to fetch content from specific URLs and convert it to Markdown so that I can read web pages in a clean format.

**Independent Test**: Call web-fetch tool with a URL and verify it returns Markdown-formatted content.
<!-- @END:STORY:US-002 -->

<!-- @STORY:US-003 priority=P2 status=done mvp=false -->
### US-003: Configurable Search Results (P2)

As an AI assistant user, I want to control the number of search results returned so that I can balance between comprehensiveness and response size.

**Independent Test**: Call web-search with num_results parameter and verify the response respects the limit.
<!-- @END:STORY:US-003 -->

<!-- @END:USER_STORIES -->

<!-- @SECTION:ACCEPTANCE_CRITERIA -->
## Acceptance Criteria

<!-- @CRITERIA_GROUP:web_search_tool story=US-001 -->
### Web Search Tool

<!-- @AC:AC-001 status=done -->
- [x] **AC-001**: THE SYSTEM SHALL provide a web-search tool that accepts a query parameter of type string.
<!-- @END:AC:AC-001 -->

<!-- @AC:AC-002 status=done -->
- [x] **AC-002**: THE SYSTEM SHALL provide a web-search tool that accepts an optional num_results parameter of type integer with minimum value 1 and maximum value 10.
<!-- @END:AC:AC-002 -->

<!-- @AC:AC-003 status=done -->
- [x] **AC-003**: WHEN num_results is not provided, THE SYSTEM SHALL default to 5 results.
<!-- @END:AC:AC-003 -->

<!-- @AC:AC-004 status=done -->
- [x] **AC-004**: WHEN web-search is called, THE SYSTEM SHALL send a POST request to https://customaugment.superclaude.dev/web-search with JSON body containing query and num_results.
<!-- @END:AC:AC-004 -->

<!-- @AC:AC-005 status=done -->
- [x] **AC-005**: WHEN the API response has is_error=false, THE SYSTEM SHALL return the tool_output field as the search result.
<!-- @END:AC:AC-005 -->

<!-- @AC:AC-006 status=done -->
- [x] **AC-006**: IF the API response has is_error=true, THEN THE SYSTEM SHALL return an error message with the tool_result_message content.
<!-- @END:AC:AC-006 -->

<!-- @AC:AC-007 status=done -->
- [x] **AC-007**: IF the HTTP request fails or times out, THEN THE SYSTEM SHALL return a formatted error message indicating the failure reason.
<!-- @END:AC:AC-007 -->

<!-- @AC:AC-008 status=done -->
- [x] **AC-008**: THE SYSTEM SHALL apply a 30-second timeout to all web-search API requests.
<!-- @END:AC:AC-008 -->

<!-- @END:CRITERIA_GROUP:web_search_tool -->

<!-- @CRITERIA_GROUP:web_fetch_tool story=US-002 -->
### Web Fetch Tool

<!-- @AC:AC-009 status=done -->
- [x] **AC-009**: THE SYSTEM SHALL provide a web-fetch tool that accepts a url parameter of type string.
<!-- @END:AC:AC-009 -->

<!-- @AC:AC-010 status=done -->
- [x] **AC-010**: WHEN web-fetch is called with a valid URL, THE SYSTEM SHALL fetch the HTML content from the URL.
<!-- @END:AC:AC-010 -->

<!-- @AC:AC-011 status=done -->
- [x] **AC-011**: WHEN HTML content is fetched successfully, THE SYSTEM SHALL convert it to Markdown format using TurndownService.
<!-- @END:AC:AC-011 -->

<!-- @AC:AC-012 status=done -->
- [x] **AC-012**: THE SYSTEM SHALL remove script, style, noscript, and iframe elements during HTML-to-Markdown conversion.
<!-- @END:AC:AC-012 -->

<!-- @AC:AC-013 status=done -->
- [x] **AC-013**: IF the URL format is invalid, THEN THE SYSTEM SHALL return an error message indicating invalid URL format.
<!-- @END:AC:AC-013 -->

<!-- @AC:AC-014 status=done -->
- [x] **AC-014**: IF the URL protocol is not http or https, THEN THE SYSTEM SHALL return an error message indicating unsupported protocol.
<!-- @END:AC:AC-014 -->

<!-- @AC:AC-015 status=done -->
- [x] **AC-015**: THE SYSTEM SHALL apply a 30-second timeout to all web-fetch HTTP requests.
<!-- @END:AC:AC-015 -->

<!-- @END:CRITERIA_GROUP:web_fetch_tool -->

<!-- @CRITERIA_GROUP:package_configuration story=US-001 -->
### Package Configuration

<!-- @AC:AC-016 status=done -->
- [x] **AC-016**: THE SYSTEM SHALL be named claude-api-web-search-mcp in package.json.
<!-- @END:AC:AC-016 -->

<!-- @AC:AC-017 status=done -->
- [x] **AC-017**: THE SYSTEM SHALL register the MCP server with name "web-search-mcp".
<!-- @END:AC:AC-017 -->

<!-- @END:CRITERIA_GROUP:package_configuration -->

<!-- @CRITERIA_GROUP:input_validation story=US-003 -->
### Input Validation

<!-- @AC:AC-018 status=done -->
- [x] **AC-018**: IF num_results is less than 1, THEN THE SYSTEM SHALL reject the request with a validation error.
<!-- @END:AC:AC-018 -->

<!-- @AC:AC-019 status=done -->
- [x] **AC-019**: IF num_results is greater than 10, THEN THE SYSTEM SHALL reject the request with a validation error.
<!-- @END:AC:AC-019 -->

<!-- @END:CRITERIA_GROUP:input_validation -->

<!-- @END:ACCEPTANCE_CRITERIA -->

<!-- @SECTION:ASSUMPTIONS -->
## Assumptions (Auto-inferred)

| Decision | Chosen | Reasoning | Alternatives |
|----------|--------|-----------|--------------|
| API Authentication | None required | Claude API endpoint does not require authentication based on provided curl example | API key, OAuth token |
| Timeout Duration | 30 seconds | Matches existing web-fetch timeout pattern in codebase | 10s, 60s |
| Error Response Format | MCP standard with isError flag | Follows existing pattern in `index.ts:142,203` | Throw exceptions, custom error objects |
| Response Format | JSON stringified | Matches existing tool response pattern in codebase | Plain text, structured object |
| num_results Default | 5 | Specified in user requirements and backlog | 3, 10 |
| API Endpoint | https://customaugment.superclaude.dev/web-search | Provided by user in backlog.md | N/A |

> These assumptions were made autonomously based on codebase patterns and user-provided requirements.
> Override in spec if different behavior is required.
<!-- @END:ASSUMPTIONS -->

<!-- @SECTION:OUT_OF_SCOPE -->
## Out of Scope

- API key management and authentication (Claude API endpoint does not require authentication)
- Multiple API key retry logic (not needed for Claude API)
- Search result caching
- Rate limiting on client side
- Custom search filters or advanced query syntax
- Pagination of search results beyond num_results parameter
- Web-fetch content caching
- Custom HTML parsing rules beyond default TurndownService configuration
<!-- @END:OUT_OF_SCOPE -->
