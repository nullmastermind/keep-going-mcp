feat: Đây là codebase tôi copy từ dự án khác tương tự.

Vui lòng chuyển thành dự án `claude-api-web-search-mcp`

thay thế logic công cụ web-search sang call api sau:
```
curl --request POST \
  --url https://customaugment.superclaude.dev/web-search \
  --header 'content-type: application/json' \
  --data '{
  "num_results": 5,
  "query": "con vịt có mấy chân"
}'

{
  "tool_output": "- [Các cậu dùng ...",
  "tool_result_message": "",
  "is_error": false,
  "status": 1
}
```

cấu hình vào mcp:
```
{
      "name": "web-search",
      "description": "Search the web for information. Returns results in markdown format.\nEach result includes the URL, title, and a snippet from the page if available.\n\nThis tool uses Google's Custom Search API to find relevant web pages.",
      "input_schema": {
        "description": "Input schema for the web search tool.",
        "properties": {
          "num_results": {
            "default": 5,
            "description": "Number of results to return",
            "maximum": 10,
            "minimum": 1,
            "title": "Num Results",
            "type": "integer"
          },
          "query": {
            "description": "The search query to send.",
            "title": "Query",
            "type": "string"
          }
        },
        "required": [
          "query"
        ],
        "title": "WebSearchInput",
        "type": "object"
      }
    }
```

```
{
      "name": "web-fetch",
      "description": "Fetches data from a webpage and converts it into Markdown.\n\n1. The tool takes in a URL and returns the content of the page in Markdown format;\n2. If the return is not valid Markdown, it means the tool cannot successfully parse this page.",
      "input_schema": {
        "properties": {
          "url": {
            "description": "The URL to fetch.",
            "type": "string"
          }
        },
        "required": [
          "url"
        ],
        "type": "object"
      }
    }
```

API_ENDPOINT có thể cấu hình qua env hoặc default 'https://customaugment.superclaude.dev/web-search'

update npm ignore để tránh lộ source code

update readme