# Build frontend
FROM node:20-alpine AS frontend-build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Build backend and serve
FROM node:20-alpine
WORKDIR /app

# Add build dependencies for native modules (like sqlite3) if needed by Alpine
COPY server/package*.json ./server/
RUN apk add --no-cache python3 make g++ \
    && cd server && npm install --omit=dev \
    && apk del python3 make g++

COPY server/ ./server/
# Copy the built frontend into the dist folder that the Express backend uses statically 
COPY --from=frontend-build /app/dist ./dist

# Initialize data directory
RUN mkdir -p data

EXPOSE 3001
ENV PORT=3001
ENV NODE_ENV=production

# Health check to ensure the application is running
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -no-proxy -qO- http://localhost:3001/api/auth/me || exit 1

CMD ["node", "server/index.js"]
