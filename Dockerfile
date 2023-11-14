### Build stage for the website frontend
FROM --platform=$BUILDPLATFORM node:20-bullseye-slim as build
RUN apt-get update && \
apt-get install -y python
WORKDIR /code
COPY . ./
RUN npm install
RUN npm run build

FROM nginx:1.25.3-alpine
COPY --from=build /code/build/ /usr/share/nginx/html
COPY --from=build /code/config.json /usr/share/nginx/html/config.json

EXPOSE 80