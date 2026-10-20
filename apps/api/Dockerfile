FROM node:22-slim

ENV PNPM_HOME="/pnpm"
ENV PATH="${PNPM_HOME}:${PATH}"
RUN corepack enable

WORKDIR /app

# Manifests first so the dependency layer is cached. The lockfile covers every
# workspace package, so all manifests must be present for --frozen-lockfile.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json
COPY packages/types/package.json ./packages/types/package.json
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm --filter @healthcare/api build

ENV NODE_ENV=production
EXPOSE 4000

# Migrations must succeed before the API starts serving (&&); a failed migration
# stops the deploy with the error in the logs instead of serving a wrong schema.
CMD ["sh", "-c", "pnpm --filter @healthcare/api migration:run:prod && pnpm --filter @healthcare/api start"]
