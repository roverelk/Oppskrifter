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

Notes and design choices
- File-based storage: each recipe is a folder whose name equals the recipe title. The markdown filename must also equal the title (e.g., Bread/Bread.md).
- Tags and metadata: supported via YAML frontmatter in the markdown file under the keys `title` and `tags`.
- The backend extracts Ingredients and Instructions sections by looking for headings in the markdown (case-insensitive; also accepts common misspelling `Ingridients`).

