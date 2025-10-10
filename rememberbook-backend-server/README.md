# Remember Book Backend Server

Minimal Flask + SQLite API for capturing and organizing ideas — a tiny "second brain" you can run locally or deploy as a microservice.

## Features

- Fast, dependency‑light Flask API (no ORM)
- Full CRUD + archive / restore lifecycle
- Notes are append-only with timestamping (historical context preserved)
- 5‑level urgency system (1–5)
- Automatic OpenAPI (Swagger UI) docs
- CORS enabled by default (good for local frontend dev)
- Portable single‑file SQLite persistence (auto‑creates DB)
- Sensible defaults: avoids macOS AirPlay port conflicts by using 5055
- Zero auth (intentionally simple). Add your own layer if deploying publicly.

## Quick Start (uv + `pyproject.toml`)

Uses [uv](https://github.com/astral-sh/uv) for fast, reproducible dependency management. No manual `requirements.txt` edits needed — `pyproject.toml` is the source of truth.

### 1. Install uv (one-time)

```bash
brew install uv              # macOS (Homebrew)
# or
curl -Ls https://astral.sh/uv/install.sh | sh
```

### 2. Clone & enter

```bash
cd rememberbook-backend-server
```

### 3. Sync environment

```bash
uv sync  # Creates .venv and installs runtime + optional dev groups
```

### 4. Open virtual environment

```bash
source .venv/bin/activate
```

### 5. Run the server

```bash
uv run python app.py
```

Default: http://localhost:5055

Custom port / host:

```bash
PORT=7000 HOST=127.0.0.1 uv run python app.py
```

### 6. (Optional) Run the demo test script

```bash
uv run python test_api.py
```

### Managing dependencies

Add a runtime dependency:

```bash
uv add rich
```

Add a dev tool:

```bash
uv add --group dev ruff
```

Sync after manual edits:

```bash
uv sync
```

Export a pinned requirements file (only if needed):

```bash
uv pip compile pyproject.toml -o requirements.txt
```

## API Documentation

Once the server is running, you can access:

- **Interactive API Docs**: http://localhost:5055/apidocs
- **API Info**: http://localhost:5055/

## API Endpoints

### Core

| Method | Endpoint              | Description                                                    |
| ------ | --------------------- | -------------------------------------------------------------- |
| GET    | `/ideas`              | List ideas (non-archived by default)                           |
| POST   | `/ideas`              | Create a new idea                                              |
| GET    | `/ideas/<id>`         | Get one idea                                                   |
| PUT    | `/ideas/<id>`         | Update title, description, urgency, append notes, archive flag |
| DELETE | `/ideas/<id>`         | Permanently delete                                             |
| POST   | `/ideas/<id>/archive` | Archive (soft hide)                                            |
| POST   | `/ideas/<id>/restore` | Restore archived idea                                          |

### Query Parameters (GET /ideas)

| Param             | Type | Default | Description                                        |
| ----------------- | ---- | ------- | -------------------------------------------------- |
| `includeArchived` | bool | false   | Include archived along with active                 |
| `archivedOnly`    | bool | false   | Return only archived (overrides `includeArchived`) |

### Urgency Levels

- **5**: Immediate
- **4**: High
- **3**: Medium (default)
- **2**: Low
- **1**: Not Important

## Example Usage

### Create a new idea

```bash
curl -X POST http://localhost:5055/ideas \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Learn FastAPI",
    "description": "Explore modern Python web framework",
    "urgency": 4
  }'
```

### Get all ideas

```bash
curl http://localhost:5055/ideas
```

### Update an idea (append a note)

```bash
curl -X PUT http://localhost:5055/ideas/<idea-id> \
  -H "Content-Type: application/json" \
  -d '{
    "notes": "Start with the official tutorial"
  }'
```

## Environment Variables

| Name              | Purpose                | Default           |
| ----------------- | ---------------------- | ----------------- |
| `PORT`            | HTTP port to bind      | `5055`            |
| `HOST`            | Host / interface       | `0.0.0.0`         |
| `REMEMBERBOOK_DB` | Path to SQLite DB file | `rememberbook.db` |

Example (custom location + port):

```bash
REMEMBERBOOK_DB=data/myideas.db PORT=7000 uv run python app.py
```

## Project Structure

```
rememberbook-backend-server/
├── app.py          # Flask API + routes + Swagger setup
├── models.py       # Domain model + SQLite persistence layer
├── test_api.py     # Demo script exercising endpoints
├── pyproject.toml  # Dependency & project metadata (uv managed)
├── uv.lock         # Lock file (deterministic installs)
└── README.md       # This file
```

## Notes

- Delete the DB to reset: `rm rememberbook.db`
- Append-only notes: each PUT with `notes` adds entries; existing notes are never overwritten
- Archiving keeps history without cluttering default list views
- This codebase is intentionally minimal — great for learning or extending
- NOT production-hardened (no auth, rate limiting, migrations, or input sanitization beyond basics)

## Maintenance Cheatsheet

| Task               | Command                                             |
| ------------------ | --------------------------------------------------- |
| Fresh environment  | `rm -rf .venv && uv sync`                           |
| Add runtime dep    | `uv add <package>`                                  |
| Add dev tool       | `uv add --group dev <package>`                      |
| List outdated      | `uv pip list --outdated`                            |
| Run server         | `uv run python app.py`                              |
| Custom port        | `PORT=7000 uv run python app.py`                    |
| Demo test script   | `uv run python test_api.py`                         |
| Export pinned reqs | `uv pip compile pyproject.toml -o requirements.txt` |

## Why uv?

- Single declarative source (`pyproject.toml`)
- Rust‑fast resolver / installer
- Clean optional groups (dev/test) when added
- Reproducible lockfile
- No global pollution

## Extending / Next Steps

Ideas for enhancement:

1. Add authentication (e.g. JWT or API key header)
2. Introduce pagination & filtering (urgency, date range)
3. Add search (SQLite FTS5 or simple LIKE)
4. Implement soft‑delete vs hard delete
5. Add tags / categories table

## Contributing

PRs and forks welcome. Keep changes small and focused. If adding dependencies, justify the need (philosophy: lean core).

## License

MIT (add a `LICENSE` file before publishing if not already included).

---

Happy building your second brain! 🧠

---

Happy building your second brain! 🧠
