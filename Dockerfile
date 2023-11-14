### Build stage for the website frontend
FROM --platform=$BUILDPLATFORM node:20 as build
RUN apt-get update && \
apt-get install -y python
WORKDIR /code
COPY . ./
RUN npm ci --no-audit --prefer-offline
RUN npm run gulp

FROM nginx:1.25.3-alpine
COPY --from=build /code/build/ /usr/share/nginx/html
COPY --from=build /code/config.json.example /usr/share/nginx/html/config.json

EXPOSE 80