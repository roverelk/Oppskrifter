FROM python:3.11-slim

WORKDIR /app

# system deps for some packages
RUN apt-get update && apt-get install -y build-essential gcc libpq-dev && rm -rf /var/lib/apt/lists/*

# copy requirements from build context
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# copy the rest of the application from the build context
COPY . /app

ENV RECIPES_DIR=/app/recipes
ENV PORT=8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
