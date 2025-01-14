# Specify platform for M1/M2 Macs
FROM --platform=linux/arm64 node:18-alpine

# Install Python and pip
RUN apk add --no-cache python3 py3-pip

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy project files
COPY . .

# Build the Next.js application
RUN npm run build

# Install Python packages with the override flag
RUN pip3 install --break-system-packages --no-cache-dir langchain-community

# Expose port 3000
EXPOSE 3000

# Start the application
CMD ["npm", "run", "dev", "--", "-p", "3000"] 