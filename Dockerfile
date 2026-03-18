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
COPY server/package*.json ./server/
RUN cd server && npm install --omit=dev
COPY server/ ./server/
# Copy the built frontend into the dist folder that the Express backend uses statically 
COPY --from=frontend-build /app/dist ./dist
# Initialize data directory
RUN mkdir -p data
EXPOSE 3001
ENV PORT=3001
CMD ["node", "server/index.js"]
