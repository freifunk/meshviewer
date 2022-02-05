### Build stage for the website frontend
FROM --platform=$BUILDPLATFORM node:14
RUN apt-get update && \
apt-get install -y python
WORKDIR /code
COPY . ./
RUN npm ci --no-audit --prefer-offline
RUN npm run gulp

EXPOSE 3000
CMD ["npm" "start"]