### Build stage for the website frontend
FROM --platform=$BUILDPLATFORM node:25-trixie-slim AS build
RUN apt-get update && apt-get install -y python3 --no-install-recommends && \
    apt-get clean && rm -rf /var/lib/apt/lists/*


WORKDIR /code
# Copy only dependency files first for better caching
COPY package*.json ./

# Install production dependencies only
RUN npm ci --no-audit --prefer-offline

# Copy the rest of the application files
COPY . .

RUN npm run lint && npm run build

FROM nginx:1.29.4-alpine
COPY --from=build /code/build/ /usr/share/nginx/html
COPY --from=build /code/config.example.json /usr/share/nginx/html/
EXPOSE 80
