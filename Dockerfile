FROM node:24-slim AS build
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile && pnpm build
# Standalone copy of the API with production dependencies only.
RUN pnpm --filter @sph/api deploy --prod --legacy /out

FROM node:24-slim
ENV NODE_ENV=production HOST=0.0.0.0 API_PORT=3000 UPLOAD_DIR=/data/uploads WEB_DIST=/app/web
WORKDIR /app
COPY --from=build /out .
COPY --from=build /repo/apps/web/dist ./web
# Owned by `node` so the named volume mounted here is writable.
RUN mkdir -p /data/uploads && chown node:node /data/uploads
USER node
EXPOSE 3000
CMD ["node", "dist/main.js"]
