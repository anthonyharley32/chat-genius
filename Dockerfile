# Base stage for both development and production
FROM node:18-alpine AS base
WORKDIR /app

# Install Python and pip
RUN apk add --no-cache python3 py3-pip

# Copy package files
COPY package*.json ./

# Development stage
FROM base AS development
RUN npm install
COPY . .
# Install Python packages
RUN pip3 install --break-system-packages --no-cache-dir langchain-community
EXPOSE 3000
CMD ["npm", "run", "dev"]

# Production build stage
FROM base AS builder
RUN npm ci
COPY . .
# Install Python packages
RUN pip3 install --break-system-packages --no-cache-dir langchain-community
RUN npm run build

# Production runtime stage
FROM base AS production
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package*.json ./
RUN npm ci --production
# Install Python packages
RUN pip3 install --break-system-packages --no-cache-dir langchain-community
EXPOSE 3000
CMD ["npm", "start"] 