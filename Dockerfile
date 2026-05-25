# Stage 1: Install dependencies and build the client
FROM node:22-slim AS build

WORKDIR /app

# Copy package files for workspace setup
COPY package.json ./
COPY package-lock.json ./
COPY client/package.json client/
COPY server/package.json server/

# Install all dependencies (including devDependencies for building)
RUN npm ci

# Copy source code
COPY shared/ shared/
COPY client/ client/
COPY server/ server/

# Build the client
RUN npm run build -w client

# Stage 2: Production image
FROM node:22-slim AS production

# Install Playwright system dependencies (Chromium)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
    libatspi2.0-0 \
    libwayland-client0 \
    fonts-noto-color-emoji \
    fonts-freefont-ttf \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package.json ./
COPY package-lock.json ./
COPY server/package.json server/

# Install production dependencies for the server workspace (tsx is included as a dependency)
RUN npm ci -w server --omit=dev --ignore-scripts

# Install Playwright Chromium browser
RUN npx -w server playwright install chromium

# Copy server source and shared types
COPY shared/ shared/
COPY server/ server/

# Copy built client from build stage
COPY --from=build /app/client/dist client/dist

# Create data directory for audit counter persistence
RUN mkdir -p server/data

# Default environment variables
ENV NODE_ENV=production
ENV PORT=80

EXPOSE 80

CMD ["npm", "start"]
