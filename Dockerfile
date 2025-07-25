# Stage 1: Build Front-end
FROM node:20-slim AS client-builder

WORKDIR /client

COPY client/package*.json ./
RUN npm install

COPY client/ .
RUN npm run build

# Stage 2: Final image with Output
FROM node:20-slim AS output

WORKDIR /output

COPY --from=client-builder /client/dist ./client/dist

COPY server/ ./server