FROM python:3.11-slim

WORKDIR /app

# copy requirements from build context
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# copy the rest of the application from the build context
COPY . /app

ENV RECIPES_DIR=/app/recipes
ENV PORT=8000

# PORT is set by docker-compose, so honour it rather than hardcoding the port.
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
