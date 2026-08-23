FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Chromium for LinkedIn scraping. Without this PlaywrightScraper throws on every
# call and silently degrades to plain requests, which hits the LinkedIn auth wall.
#
# The system libraries are installed by hand rather than via
# `playwright install --with-deps`: that helper asks for ttf-unifont and
# ttf-ubuntu-font-family, neither of which exists on Debian trixie (the current
# python:3.11-slim base), so it fails the build. The t64 suffixes are the
# trixie time_t transition names.
RUN apt-get update && apt-get install -y --no-install-recommends \
    libnss3 libnspr4 libatk1.0-0t64 libatk-bridge2.0-0t64 libcups2t64 \
    libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 \
    libgbm1 libpango-1.0-0 libcairo2 libasound2t64 libatspi2.0-0t64 \
    libx11-6 libxcb1 libxext6 fonts-liberation \
    && rm -rf /var/lib/apt/lists/* \
    && playwright install chromium

COPY . .

# Making directories
RUN mkdir -p uploads logs

ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8000}/health || exit 1

RUN chmod +x entrypoint.sh

CMD ["./entrypoint.sh"]
