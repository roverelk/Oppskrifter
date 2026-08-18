import os
import re
from urllib.parse import quote
from typing import List, Dict, Optional

from fastapi import FastAPI, UploadFile, File, HTTPException
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
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure recipes dir exists
os.makedirs(RECIPES_DIR, exist_ok=True)

# Mount the recipes folder so images and markdown are directly available at /recipes/
app.mount("/recipes", StaticFiles(directory=RECIPES_DIR), name="recipes")


def image_route(dir_name: str, filename: str) -> str:
    """URL for an image under the /recipes static mount.

    Recipe directories are named after the recipe title, so they routinely
    contain spaces and other characters that must be percent-encoded before a
    browser will fetch them.
    """
    return f"/recipes/{quote(dir_name)}/{quote(filename)}"


# Written into the /recipes static mount, so keep it to formats a browser renders
# as an image and nothing else.
IMAGE_EXTENSIONS = ('.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif')


def image_extension(filename: str) -> str:
    ext = os.path.splitext(filename or '')[1].lower()
    if ext not in IMAGE_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported image type. Use one of: {', '.join(IMAGE_EXTENSIONS)}",
        )
    return ext


def recipe_path(dir_name: str) -> str:
    """Path of a recipe directory, refusing anything that could escape RECIPES_DIR.

    The name comes from a URL path segment or a recipe title, so it must never be
    joined blind: delete_recipe hands the result to shutil.rmtree.
    """
    name = (dir_name or '').strip()
    if not name or name.startswith('.') or '/' in name or '\\' in name or '..' in name:
        raise HTTPException(status_code=400, detail="Invalid recipe name")
    return os.path.join(RECIPES_DIR, name)


def normalize_tags(tags) -> List[str]:
    """Frontmatter tags, always as a list of strings.

    "tags: dinner" parses as a bare string, which the UI would then iterate one
    character at a time.
    """
    if tags is None:
        return []
    if isinstance(tags, str):
        tags = [tags]
    if not isinstance(tags, (list, tuple)):
        return []
    return [str(t).strip() for t in tags if str(t).strip()]


def find_image(recipe_dir: str) -> Optional[str]:
    """The recipe's image file name, if it has one.

    Sorted, so the pick stays stable when a directory holds more than one
    image.* (e.g. a leftover image.png next to a new image.jpg).
    """
    for f in sorted(os.listdir(recipe_dir)):
        if f.lower().startswith('image.'):
            return f
    return None


def find_markdown_file(recipe_dir: str, title: str) -> Optional[str]:
    candidate = os.path.join(recipe_dir, f"{title}.md")
    if os.path.isfile(candidate):
        return candidate
    # fallback: any .md file
    for f in os.listdir(recipe_dir):
        if f.lower().endswith('.md'):
            return os.path.join(recipe_dir, f)
    return None


# Headings may be #, ##, ### etc.
HEADING = re.compile(r"^#{1,6}\s*(.+)$", flags=re.MULTILINE)


def title_from_markdown(raw: bytes) -> str:
    """The recipe's title, taken from the markdown file itself.

    The file is the single source of the title: it names the recipe in the UI and
    it names the directory and the .md file on disk. Prefer the frontmatter
    "title:", and fall back to the first heading so a file without frontmatter
    still works.
    """
    try:
        text = raw.decode('utf-8')
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="The markdown file must be UTF-8")
    title = ''
    try:
        post = frontmatter.loads(text)
        title = str(post.get('title') or '').strip()
        body = post.content
    except Exception:
        body = text
    if not title:
        # The first heading, but never a section heading: "# Ingredienser" names
        # a part of the recipe, not the recipe.
        for m in HEADING.finditer(body):
            heading = m.group(1).strip()
            if not is_ingredients_heading(heading) and not is_instructions_heading(heading):
                title = heading
                break
    if not title:
        raise HTTPException(
            status_code=400,
            detail="The markdown file needs a title: add \"title: ...\" to its frontmatter, "
                   "or start it with a heading.",
        )
    # Reject titles that cannot be a directory name; recipe_path raises for us.
    recipe_path(title)
    return title


def render_inline(text: str) -> str:
    """Render one line of markdown as inline HTML.

    Ingredients, steps and table cells are single lines, so drop the wrapping
    <p> that markdown adds and keep only the emphasis, code and links.
    """
    html = markdown.markdown(text.strip()).strip()
    if html.startswith('<p>') and html.endswith('</p>'):
        html = html[3:-4]
    return html


def extract_sections(md_text: str) -> Dict[str, str]:
    # Find headings and collect sections.
    headings = list(HEADING.finditer(md_text))
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
            items.append(render_inline(ln.lstrip('-* ').strip()))
        else:
            # also accept plain lines
            items.append(render_inline(ln))
    return items


def parse_instructions(section_text: str) -> List[str]:
    lines = [l.strip() for l in section_text.splitlines() if l.strip()]
    steps = []
    for ln in lines:
        # numbered list
        if re.match(r"^\d+\.", ln):
            steps.append(render_inline(re.sub(r"^\d+\.\s*", "", ln)))
        elif ln.startswith('-'):
            steps.append(render_inline(ln.lstrip('- ').strip()))
        else:
            steps.append(render_inline(ln))
    return steps


# Headings are written by hand, in Norwegian as often as English, so match on
# stems: "Ingredienser" contains no "ingredient", and "Fremgangmate" contains no
# "instruction". Compared against the heading with diacritics folded.
INGREDIENT_HEADINGS = ('ingredien', 'ingridien', 'ravare', 'det du trenger')
INSTRUCTION_HEADINGS = (
    'instruction', 'step', 'method', 'direction',
    'fremgang', 'framgang', 'metode', 'tilberedning', 'slik', 'steg',
    'oppskrift', 'gjennomforing',
)


def fold(text: str) -> str:
    """Lowercase and strip Norwegian diacritics for tolerant heading matching."""
    lowered = text.strip().lower()
    for src, dst in (('\u00e6', 'ae'), ('\u00f8', 'o'), ('\u00e5', 'a')):
        lowered = lowered.replace(src, dst)
    return lowered


def is_ingredients_heading(heading: str) -> bool:
    folded = fold(heading)
    return any(stem in folded for stem in INGREDIENT_HEADINGS)


def is_instructions_heading(heading: str) -> bool:
    folded = fold(heading)
    return any(stem in folded for stem in INSTRUCTION_HEADINGS)


# A GFM table block: rows fenced by pipes, the second one a |---|---| separator.
TABLE_SEPARATOR = re.compile(r"^\|?[\s:|-]+\|[\s:|-]*$")


def split_table_row(line: str) -> List[str]:
    cells = line.strip().split('|')
    # A fenced row ("| a | b |") yields empty strings at both ends.
    if cells and not cells[0].strip():
        cells = cells[1:]
    if cells and not cells[-1].strip():
        cells = cells[:-1]
    return [c.strip() for c in cells]


def parse_table(lines: List[str]) -> Optional[Dict]:
    """Turn a run of pipe-delimited lines into headers plus rows.

    Hand-written tables tend to carry the empty columns and rows left over from
    whatever editor drew them, so drop anything that holds no text at all.
    """
    rows = [split_table_row(ln) for ln in lines if not TABLE_SEPARATOR.match(ln.strip())]
    if not rows:
        return None
    width = max(len(r) for r in rows)
    rows = [r + [''] * (width - len(r)) for r in rows]
    keep = [i for i in range(width) if any(r[i] for r in rows)]
    if not keep:
        return None
    rows = [[render_inline(r[i]) for i in keep] for r in rows]
    headers, body = rows[0], [r for r in rows[1:] if any(r)]
    return {"headers": headers, "rows": body}


def split_tables(section_text: str) -> (str, List[Dict]):
    """Separate table blocks from the rest of a section's text."""
    lines = section_text.splitlines()
    prose, tables, i = [], [], 0
    while i < len(lines):
        stripped = lines[i].strip()
        is_table_start = (
            stripped.startswith('|')
            and i + 1 < len(lines)
            and TABLE_SEPARATOR.match(lines[i + 1].strip())
        )
        if not is_table_start:
            prose.append(lines[i])
            i += 1
            continue
        block = []
        while i < len(lines) and lines[i].strip().startswith('|'):
            block.append(lines[i])
            i += 1
        table = parse_table(block)
        if table:
            tables.append(table)
    return '\n'.join(prose), tables


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
                    tags = normalize_tags(post.get('tags'))
                except Exception:
                    pass
            image_url = None
            image = find_image(path)
            if image:
                has_image = True
                image_url = image_route(entry, image)
            out.append({
                "title": title,
                "dir": entry,
                "tags": tags,
                "has_image": has_image,
                "image_url": image_url,
            })
    return out


@app.get("/api/recipes/{dir_name}")
async def get_recipe(dir_name: str):
    path = recipe_path(dir_name)
    if not os.path.isdir(path):
        raise HTTPException(status_code=404, detail="Recipe not found")
    mdfile = find_markdown_file(path, dir_name)
    if not mdfile:
        raise HTTPException(status_code=404, detail="Markdown file not found in recipe directory")
    # The editor round-trips the file verbatim, so keep the raw source
    # (frontmatter included) alongside the parsed body.
    with open(mdfile, 'r', encoding='utf-8') as f:
        raw_md = f.read()
    try:
        post = frontmatter.loads(raw_md)
        md_text = post.content
    except Exception:
        md_text = raw_md
        post = {'title': dir_name, 'tags': []}
    # nl2br: recipes routinely list ingredients as bare lines rather than a
    # markdown list, and the fallback rendering must not run them together.
    # tables: so the fallback renders hand-written GFM tables as tables.
    html = markdown.markdown(md_text, extensions=['nl2br', 'tables'])
    sections = extract_sections(md_text)
    ingredients = None
    instructions = None
    ingredients_heading = None
    instructions_heading = None
    ingredients_tables = []
    instructions_tables = []
    # Tables under headings we do not otherwise recognise (nutrition, yields, ...)
    # still belong on the page, so keep them with their own heading.
    other_tables = []
    for k, v in sections.items():
        # Tables come out first: their pipe rows are not ingredients or steps.
        prose, tables = split_tables(v)
        if is_ingredients_heading(k):
            ingredients = parse_ingredients(prose)
            ingredients_heading = k.strip()
            ingredients_tables = tables
        elif is_instructions_heading(k):
            instructions = parse_instructions(prose)
            instructions_heading = k.strip()
            instructions_tables = tables
        else:
            other_tables.extend({"heading": k.strip(), **t} for t in tables)
    image = find_image(path)
    image_url = image_route(dir_name, image) if image else None
    return {
        "title": post.get('title', dir_name),
        "tags": normalize_tags(post.get('tags')),
        "html": html,
        "markdown": raw_md,
        "ingredients": ingredients,
        "instructions": instructions,
        "ingredients_tables": ingredients_tables,
        "instructions_tables": instructions_tables,
        "tables": other_tables,
        # The recipe's own heading text, so the UI can label the cards in
        # whatever language the recipe was written in.
        "ingredients_heading": ingredients_heading,
        "instructions_heading": instructions_heading,
        "image_url": image_url,
        "dir": dir_name,
    }


@app.post("/api/recipes")
async def create_recipe(markdown_file: UploadFile = File(...), image: UploadFile = File(None)):
    # The markdown file is the single source of the title, and the title names
    # both the directory and the .md file inside it.
    content = await markdown_file.read()
    title = title_from_markdown(content)
    dest_dir = recipe_path(title)
    if os.path.exists(dest_dir):
        raise HTTPException(status_code=400, detail="Recipe directory already exists")
    ext = image_extension(image.filename) if image else None
    os.makedirs(dest_dir, exist_ok=False)
    with open(os.path.join(dest_dir, f"{title}.md"), "wb") as f:
        f.write(content)
    if image:
        with open(os.path.join(dest_dir, f"image{ext}"), "wb") as f:
            f.write(await image.read())
    return JSONResponse({"ok": True, "dir": title})


@app.post("/api/recipes/{dir_name}/edit")
async def edit_recipe(dir_name: str, markdown_file: UploadFile = File(None), image: UploadFile = File(None)):
    dest_dir = recipe_path(dir_name)
    if not os.path.isdir(dest_dir):
        raise HTTPException(status_code=404, detail="Recipe directory not found")
    ext = image_extension(image.filename) if image else None
    if markdown_file:
        content = await markdown_file.read()
        title = title_from_markdown(content)
        if title != dir_name:
            # Retitling a recipe renames its directory and its .md file, so the
            # names on disk keep matching what the site shows.
            new_dir = recipe_path(title)
            if os.path.exists(new_dir):
                raise HTTPException(
                    status_code=400,
                    detail=f"Another recipe is already called \u201c{title}\u201d",
                )
            os.rename(dest_dir, new_dir)
            dest_dir = new_dir
            # The old file may be named after the old title or something else
            # entirely, for recipes created before this rule existed.
            old_md = find_markdown_file(dest_dir, dir_name)
            md_path = os.path.join(dest_dir, f"{title}.md")
            if old_md and os.path.abspath(old_md) != os.path.abspath(md_path):
                os.remove(old_md)
            dir_name = title
        with open(os.path.join(dest_dir, f"{dir_name}.md"), "wb") as f:
            f.write(content)
    if image:
        # remove existing image.*
        for f in os.listdir(dest_dir):
            if f.lower().startswith('image.'):
                try:
                    os.remove(os.path.join(dest_dir, f))
                except Exception:
                    pass
        with open(os.path.join(dest_dir, f"image{ext}"), "wb") as f:
            f.write(await image.read())
    return {"ok": True, "dir": dir_name}


@app.delete("/api/recipes/{dir_name}")
async def delete_recipe(dir_name: str):
    dest_dir = recipe_path(dir_name)
    if not os.path.isdir(dest_dir):
        raise HTTPException(status_code=404, detail="Recipe directory not found")
    shutil.rmtree(dest_dir)
    return {"ok": True}
