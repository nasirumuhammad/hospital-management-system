FROM node:22-slim

ENV PNPM_HOME="/pnpm"
ENV PATH="${PNPM_HOME}:${PATH}"
RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json
COPY packages/types/package.json ./packages/types/package.json
RUN pnpm install --frozen-lockfile

COPY . .

# Inlined into the browser bundle at build time. Defaults to the same-origin /api
# proxy; API_INTERNAL_URL is read at runtime and is deliberately NOT a build arg.
ARG NEXT_PUBLIC_API_URL=/api
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

RUN pnpm --filter @healthcare/web build

ENV NODE_ENV=production
EXPOSE 3000

CMD ["pnpm", "--filter", "@healthcare/web", "start"]
