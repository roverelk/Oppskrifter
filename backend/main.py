import os
import re
from typing import List, Dict, Optional

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import frontmatter
import markdown
import shutil

RECIPES_DIR = os.environ.get("RECIPES_DIR", "recipes")

app = FastAPI(title="Oppskrifter Backend")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure recipes dir exists
os.makedirs(RECIPES_DIR, exist_ok=True)

# Mount the recipes folder so images and markdown are directly available at /recipes/
app.mount("/recipes", StaticFiles(directory=RECIPES_DIR), name="recipes")


def find_markdown_file(recipe_dir: str, title: str) -> Optional[str]:
    candidate = os.path.join(recipe_dir, f"{title}.md")
    if os.path.isfile(candidate):
        return candidate
    # fallback: any .md file
    for f in os.listdir(recipe_dir):
        if f.lower().endswith('.md'):
            return os.path.join(recipe_dir, f)
    return None


def extract_sections(md_text: str) -> Dict[str, str]:
    # Find headings and collect sections. Headings may be #, ##, ### etc.
    headings = list(re.finditer(r"^#{1,6}\s*(.+)$", md_text, flags=re.MULTILINE))
    sections = {}
    if not headings:
        return sections
    for i, m in enumerate(headings):
        key = m.group(1).strip()
        start = m.end()
        end = headings[i+1].start() if i+1 < len(headings) else len(md_text)
        content = md_text[start:end].strip()
        sections[key] = content
    return sections


def parse_ingredients(section_text: str) -> List[str]:
    lines = [l.strip() for l in section_text.splitlines() if l.strip()]
    items = []
    for ln in lines:
        if ln.startswith(('-', '*')):
            items.append(ln.lstrip('-* ').strip())
        else:
            # also accept plain lines
            items.append(ln)
    return items


def parse_instructions(section_text: str) -> List[str]:
    lines = [l.strip() for l in section_text.splitlines() if l.strip()]
    steps = []
    for ln in lines:
        # numbered list
        if re.match(r"^\d+\.", ln):
            steps.append(re.sub(r"^\d+\.\s*", "", ln))
        elif ln.startswith('-'):
            steps.append(ln.lstrip('- ').strip())
        else:
            steps.append(ln)
    return steps


@app.get("/api/recipes")
async def list_recipes():
    if not os.path.isdir(RECIPES_DIR):
        return []
    out = []
    for entry in sorted(os.listdir(RECIPES_DIR)):
        path = os.path.join(RECIPES_DIR, entry)
        if os.path.isdir(path):
            mdfile = find_markdown_file(path, entry)
            title = entry
            tags = []
            has_image = False
            if mdfile:
                try:
                    post = frontmatter.load(mdfile)
                    title = post.get('title', title)
                    tags = post.get('tags', []) or []
                except Exception:
                    pass
            # check for any image files
            for f in os.listdir(path):
                if f.lower().startswith('image.'):
                    has_image = True
                    break
            out.append({"title": title, "dir": entry, "tags": tags, "has_image": has_image})
    return out


@app.get("/api/recipes/{dir_name}")
async def get_recipe(dir_name: str):
    path = os.path.join(RECIPES_DIR, dir_name)
    if not os.path.isdir(path):
        raise HTTPException(status_code=404, detail="Recipe not found")
    mdfile = find_markdown_file(path, dir_name)
    if not mdfile:
        raise HTTPException(status_code=404, detail="Markdown file not found in recipe directory")
    try:
        post = frontmatter.load(mdfile)
        md_text = post.content
    except Exception:
        with open(mdfile, 'r', encoding='utf-8') as f:
            md_text = f.read()
        post = {'title': dir_name, 'tags': []}
    html = markdown.markdown(md_text)
    sections = extract_sections(md_text)
    ingredients = None
    instructions = None
    # match headings case-insensitive
    for k, v in sections.items():
        lk = k.strip().lower()
        if 'ingredient' in lk or 'ingridient' in lk:
            ingredients = parse_ingredients(v)
        if 'instruction' in lk or 'step' in lk:
            instructions = parse_instructions(v)
    image_url = None
    for f in os.listdir(path):
        if f.lower().startswith('image.'):
            image_url = f"/recipes/{dir_name}/{f}"
            break
    return {
        "title": post.get('title', dir_name),
        "tags": post.get('tags', []),
        "html": html,
        "ingredients": ingredients,
        "instructions": instructions,
        "image_url": image_url,
        "dir": dir_name,
    }


@app.post("/api/recipes")
async def create_recipe(title: str = Form(...), markdown_file: UploadFile = File(...), image: UploadFile = File(None)):
    # IMPORTANT: per your request, directory name and file name will exactly match the title provided
    dir_name = title
    # Basic validation: prevent path traversal
    if '/' in dir_name or '..' in dir_name:
        raise HTTPException(status_code=400, detail="Invalid title")
    dest_dir = os.path.join(RECIPES_DIR, dir_name)
    if os.path.exists(dest_dir):
        raise HTTPException(status_code=400, detail="Recipe directory already exists")
    os.makedirs(dest_dir, exist_ok=False)
    md_path = os.path.join(dest_dir, f"{title}.md")
    with open(md_path, "wb") as f:
        f.write(await markdown_file.read())
    if image:
        ext = os.path.splitext(image.filename)[1]
        img_path = os.path.join(dest_dir, f"image{ext}")
        with open(img_path, "wb") as f:
            f.write(await image.read())
    return JSONResponse({"ok": True, "dir": dir_name})


@app.post("/api/recipes/{dir_name}/edit")
async def edit_recipe(dir_name: str, markdown_file: UploadFile = File(None), image: UploadFile = File(None)):
    dest_dir = os.path.join(RECIPES_DIR, dir_name)
    if not os.path.isdir(dest_dir):
        raise HTTPException(status_code=404, detail="Recipe directory not found")
    if markdown_file:
        md_path = os.path.join(dest_dir, f"{dir_name}.md")
        with open(md_path, "wb") as f:
            f.write(await markdown_file.read())
    if image:
        # remove existing image.*
        for f in os.listdir(dest_dir):
            if f.lower().startswith('image.'):
                try:
                    os.remove(os.path.join(dest_dir, f))
                except Exception:
                    pass
        ext = os.path.splitext(image.filename)[1]
        img_path = os.path.join(dest_dir, f"image{ext}")
        with open(img_path, "wb") as f:
            f.write(await image.read())
    return {"ok": True}


@app.delete("/api/recipes/{dir_name}")
async def delete_recipe(dir_name: str):
    dest_dir = os.path.join(RECIPES_DIR, dir_name)
    if not os.path.isdir(dest_dir):
        raise HTTPException(status_code=404, detail="Recipe directory not found")
    shutil.rmtree(dest_dir)
    return {"ok": True}
