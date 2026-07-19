# Santri-Pay Development Environment
# This container provides a consistent development environment

FROM oven/bun:1

# Install Wrangler globally
RUN bun add -g wrangler

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json bun.lock* ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Expose port for dev server
EXPOSE 5173

# Default command - start dev server
CMD ["bun", "run", "dev"]
