# AI TodoFlow Custom Model Guide

This guide describes how to train and serve a custom AI model for the DailyFlow TodoFlow workflow.

## Goal

The model should help with two app tasks:

- Analyze TodoFlow data and return structured planning JSON.
- Create a TodoFlow draft and return structured TodoFlow JSON.

The app sends a single prompt containing the task instructions, user request, and local TodoFlow context. Your server should preserve the JSON schema requested inside that prompt.

## Custom Endpoint Contract

Configure the AI TodoFlow page with:

- Provider: `Custom Config`
- Custom URL: your HTTPS endpoint
- API key: bearer token
- Model: your model id, for example `dailyflow-todoflow-v1`

The app sends:

```json
{
  "model": "dailyflow-todoflow-v1",
  "prompt": "full TodoFlow prompt"
}
```

Headers:

```http
Authorization: Bearer <api-key>
Content-Type: application/json
```

The server can return any of these text shapes:

```json
{ "text": "{\"summary\":\"...\"}" }
```

```json
{ "output_text": "{\"title\":\"...\"}" }
```

```json
{ "response": "{\"title\":\"...\"}" }
```

OpenAI-compatible responses such as `choices[0].message.content` are also accepted.

## Training Data Shape

Use prompt-completion examples from real app scenarios:

```json
{
  "messages": [
    {
      "role": "system",
      "content": "You are an AI productivity analyst for a TodoFlow desktop app. Return only valid JSON."
    },
    {
      "role": "user",
      "content": "Prompt from DailyFlow including mode, language, user request, and DATA SUMMARY."
    },
    {
      "role": "assistant",
      "content": "{\"summary\":\"...\",\"metrics\":{\"plannedSeconds\":3600,\"actualSeconds\":1200,\"completionRate\":33,\"overloadSeconds\":0,\"riskyItemCount\":1},\"risks\":[],\"priorities\":[],\"scheduleSuggestions\":[],\"estimationInsights\":[],\"actionPlan\":[]}"
    }
  ]
}
```

For draft creation, train completions like:

```json
{
  "title": "Focused implementation block",
  "suggestedDurationMinutes": 90,
  "tasks": [
    {
      "title": "Fix dashboard scroll warning",
      "estimatedMinutes": 25,
      "subtasks": [
        { "title": "Use non-passive wheel listener", "completed": false }
      ]
    }
  ]
}
```

## Quality Rules

- Return raw JSON only, without markdown fences.
- Do not invent tasks, dates, or completion state that are not in the prompt.
- Keep JSON keys exactly as requested by the prompt.
- Write user-facing string values in the requested language.
- For no-data prompts, explain the lack of local data and suggest a first TodoFlow instead of pretending context exists.

## Recommended Server Behavior

- Validate the bearer token.
- Forward `{ model, prompt }` to your local model or training server.
- Enforce a JSON-only post-processing check before returning.
- Return HTTP 4xx with `{ "error": { "message": "..." } }` for user-fixable configuration errors.
