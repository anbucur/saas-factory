FROM node:22-alpine
WORKDIR /app

# Install dependencies
COPY package*.json package-lock.json* ./
RUN npm ci

# Copy source
COPY . .

# Build if build script exists
# No build step detected

EXPOSE 3000
ENV NODE_ENV=production
CMD ["npm","start"]
