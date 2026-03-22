FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY apps/factory-worker/package*.json ./

RUN npm install

COPY apps/factory-worker/dist ./dist
COPY apps/factory-backend/dist ./backend-dist
COPY apps/factory-backend/data ./data
COPY packages/temporal-workflows/dist ./workflows-dist
COPY packages/shared/dist ./shared-dist

ENV NODE_ENV=production
ENV TEMPORAL_ADDRESS=temporal:7233
ENV DATABASE_PATH=/app/data/saas-factory.db

CMD ["node", "dist/index.js"]
