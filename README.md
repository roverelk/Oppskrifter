# Recipes folder

This repository contains a simple dockerized recipes website with separate frontend and backend.

Structure:
- frontend/ - React + Vite single page app that lists recipes and provides a small admin UI to create/edit/delete recipes.
- backend/ - FastAPI backend that reads/writes recipes from the filesystem and serves images under /recipes/*
- recipes/ - directory mounted into the backend container. Each recipe has its own directory: recipes/<Title>/<Title>.md and optional image (image.jpg or image.png).
- docker-compose.yml - builds and runs frontend and backend. Ports are configurable via environment variables.

Usage (local)

1. Build and start with docker-compose:

   BACKEND_PORT=8000 FRONTEND_PORT=3000 docker-compose up --build

2. The frontend will be available on http://localhost:3000
   The backend API on http://localhost:8000/api/

Usage (frontend dev server)

Handy when iterating on the UI. Start the backend first, then Vite; `vite.config.js`
proxies `/api` and `/recipes` to it (nginx does that job in the Docker image).

   cd backend && RECIPES_DIR=../recipes uvicorn main:app --port 8000
   cd frontend && npm install && npm run dev

Set `BACKEND_ORIGIN` if the backend is not on http://localhost:8000.

User interface
- Material Design, built with MUI (`@mui/material`) on a teal/amber palette defined once in
  `frontend/src/theme.js`. Light and dark themes are both supported; the toggle in the app bar
  remembers your choice and otherwise follows the OS setting.
- Desktop: a permanent sidebar with search, tag filters and the recipe list, next to the recipe.
- Phone: everything collapses into a single hamburger menu (search, tag filters, the list and
  "New recipe"), and exactly one recipe is on screen at a time — the app bar's back arrow
  returns to the list.
- Recipes are created and edited in the same dialog, which goes full-screen on small viewports.
  The title is not a separate field: it comes from the markdown file's `title:` frontmatter (or its
  first heading), so there is only ever one place to write it. Changing the title while editing
  renames the recipe's folder and its `.md` file to match.
- Markdown formatting — **bold**, *italics*, `code`, links and tables — renders inside the
  ingredient list, the steps and the tables, so recipes can be properly formatted.

Notes and design choices
- File-based storage: each recipe is a folder whose name equals the recipe title, and the markdown
  file inside it is named after the title too (e.g., `Bread/Bread.md`). The backend keeps both names
  in step with the title as it changes; a folder whose `.md` is named something else is still read.
- Tags and metadata: supported via YAML frontmatter in the markdown file under the keys `title` and
  `tags`. `title` is the one source of the recipe's name — the UI never asks for it separately.
- The backend extracts Ingredients and Instructions sections by looking for headings in the markdown (case-insensitive; also accepts common misspelling `Ingridients`).

