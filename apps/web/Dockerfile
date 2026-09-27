FROM oven/bun:1.3.6 AS builder

WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

FROM oven/bun:1.3.6

WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=builder /app ./

EXPOSE 3000
CMD ["bun", "run", "start", "--hostname", "0.0.0.0"]
