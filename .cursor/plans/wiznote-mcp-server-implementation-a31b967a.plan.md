<!-- a31b967a-26bc-4aee-9272-5558911dc479 befac6e1-3d38-4bfc-bc1d-57b4c32830f9 -->
# WizNote MCP Server Implementation Plan

## Overview

Create a standalone MCP server that exposes WizNote's core functionality (notes, flashcards, quizzes) through the Model Context Protocol, enabling AI assistants to interact with user data via natural language commands.

## Architecture

### Project Structure

```
wiznote-mcp-server/
├── src/
│   ├── index.ts                 # Main server entry point
│   ├── server.ts                # MCP server setup & configuration
│   ├── tools/
│   │   ├── notes.ts             # Note-related tools
│   │   ├── flashcards.ts        # Flashcard tools
│   │   ├── quizzes.ts           # Quiz tools
│   │   └── search.ts             # Search & query tools
│   ├── resources/
│   │   ├── notes.ts             # Note resources
│   │   └── stats.ts             # Statistics resources
│   ├── auth/
│   │   ├── supabase.ts          # Supabase client setup
│   │   └── middleware.ts        # Auth middleware
│   ├── types/
│   │   └── mcp.ts               # MCP-specific types
│   └── utils/
│       ├── validation.ts        # Input validation
│       └── errors.ts            # Error handling
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

## Implementation Steps

### 1. Project Setup

- Create new directory `wiznote-mcp-server` (or add to existing structure)
- Initialize Node.js/TypeScript project with dependencies:
  - `@modelcontextprotocol/sdk` - MCP SDK
  - `@supabase/supabase-js` - Supabase client
  - `zod` - Schema validation
  - `dotenv` - Environment variables

### 2. Core MCP Server

- Implement MCP server class extending MCP SDK Server
- Configure transport (stdio for CLI, HTTP for web)
- Set up error handling and logging
- Implement server lifecycle management

### 3. Authentication & Authorization

- Create Supabase client for MCP server (server-side key)
- Implement user authentication via Supabase session
- Add middleware to validate user context
- Ensure RLS policies are respected
- Add rate limiting per user

### 4. Note Tools (CRUD Operations)

Tools to expose:

- `list_notes` - List user's notes with filters (tags, archived, favorites)
- `get_note` - Retrieve specific note by ID
- `create_note` - Create new note
- `update_note` - Update existing note
- `delete_note` - Delete note
- `search_notes` - Search notes by query string
- `get_notes_by_tag` - Filter notes by tag
- `get_pinned_notes` - Get all pinned notes

### 5. Flashcard Tools

Tools to expose:

- `list_flashcard_sets` - List all flashcard sets for user
- `get_flashcard_set` - Get specific set with cards
- `generate_flashcards` - Generate flashcards from note using AI
- `create_flashcard` - Create manual flashcard
- `update_flashcard` - Update flashcard
- `delete_flashcard` - Delete flashcard
- `get_flashcard_stats` - Get user study statistics
- `search_flashcards` - Search flashcards with filters

### 6. Quiz Tools

Tools to expose:

- `list_quizzes` - List user's quizzes
- `get_quiz` - Get quiz with questions
- `create_quiz` - Create new quiz (with AI generation support)
- `delete_quiz` - Delete quiz
- `get_quiz_statistics` - Get quiz usage stats

### 7. Resource Handlers

Resources to expose:

- `note://{noteId}` - Access note content as resource
- `flashcards://{setId}` - Access flashcard set as resource
- `stats://summary` - User statistics summary

### 8. Search & Query Tools

Advanced tools:

- `semantic_search_notes` - Semantic search across notes
- `find_related_notes` - Find notes with similar content/tags
- `get_user_statistics` - Comprehensive user stats

### 9. Error Handling & Validation

- Implement Zod schemas for all tool inputs
- Create standardized error responses
- Add error logging
- Handle Supabase errors gracefully
- Validate user permissions for each operation

### 10. Configuration & Environment

- Create `.env.example` with required variables:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY` (for server-side access)
  - `MCP_SERVER_PORT` (if using HTTP transport)
- Add environment validation on startup

### 11. Testing

- Unit tests for individual tools
- Integration tests with mock Supabase
- Test authentication flows
- Test error scenarios

### 12. Documentation

- README with setup instructions
- Tool descriptions and examples
- Authentication guide
- Deployment guide

## Key Design Decisions

1. **Separate Server**: MCP server as standalone service (not embedded in main app)
2. **Supabase Access**: Use service role key for server-side operations, validate user context
3. **Transport**: Support stdio (for CLI tools) and HTTP (for web integrations)
4. **Caching**: Implement simple in-memory cache for frequently accessed notes
5. **Rate Limiting**: Per-user rate limits to prevent abuse

## Security Considerations

- Never expose service role key to client
- Validate user authentication on every request
- Respect Supabase RLS policies
- Sanitize all user inputs
- Implement request throttling

## Future Enhancements

- WebSocket support for real-time updates
- Batch operations for efficiency
- Export functionality (notes/flashcards to various formats)
- Integration with external AI services
- Advanced analytics and insights

### To-dos

- [ ] Initialize MCP server project with TypeScript, dependencies (@modelcontextprotocol/sdk, @supabase/supabase-js, zod), and project structure
- [ ] Implement core MCP server class with transport configuration (stdio/HTTP) and lifecycle management
- [ ] Create Supabase authentication middleware that validates user sessions and respects RLS policies
- [ ] Implement note tools: list_notes, get_note, create_note, update_note, delete_note, search_notes, get_notes_by_tag, get_pinned_notes
- [ ] Implement flashcard tools: list_flashcard_sets, get_flashcard_set, generate_flashcards, create_flashcard, update_flashcard, delete_flashcard, get_flashcard_stats, search_flashcards
- [ ] Implement quiz tools: list_quizzes, get_quiz, create_quiz, delete_quiz, get_quiz_statistics
- [ ] Implement resource handlers for notes and flashcard sets (note://, flashcards://, stats://)
- [ ] Add Zod schema validation for all tool inputs and implement standardized error handling with logging
- [ ] Create environment configuration with .env.example, validate required variables, and add rate limiting
- [ ] Write README with setup instructions, tool descriptions, authentication guide, and usage examples