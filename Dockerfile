### Build stage for the website frontend
FROM --platform=$BUILDPLATFORM node:14 as build
RUN apt-get update && \
apt-get install -y python
WORKDIR /code
COPY . ./
RUN npm ci --no-audit --prefer-offline
RUN npm run gulp

FROM nginx:1.21.6-alpine
COPY --from=build /code/build/* /usr/share/nginx/html
COPY --from=build /code/config.json /usr/share/nginx/html
COPY --from=build /code/locale/ /usr/share/nginx/html/


EXPOSE 80