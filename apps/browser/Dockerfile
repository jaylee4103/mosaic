FROM oven/bun:1.3.6 AS bun

# This image already contains the Chromium build required by playwright@1.63.0.
FROM mcr.microsoft.com/playwright:v1.63.0-noble

WORKDIR /app
COPY --from=bun /usr/local/bin/bun /usr/local/bin/bun

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --ignore-scripts

COPY src/ ./src/
COPY tsconfig.json ./
RUN bun test
RUN chown -R pwuser:pwuser /app

USER pwuser
EXPOSE 8100
CMD ["bun", "run", "start"]
