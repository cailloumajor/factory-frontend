# syntax=docker/dockerfile:1.3

FROM --platform=$BUILDPLATFORM node:20.12.0 AS frontend-builder

WORKDIR /usr/src/app

ENV YARN_CACHE_FOLDER=/var/cache/yarn
COPY .npmrc package.json yarn.lock ./
RUN --mount=type=cache,target=/var/cache/yarn \
    --mount=type=secret,id=GHP_AUTH_TOKEN \
    GHP_AUTH_TOKEN=$(cat /run/secrets/GHP_AUTH_TOKEN) yarn install

COPY public ./public
COPY src ./src
COPY index.html \
     .eslintignore \
     .eslintrc.js \
     .prettierrc \
     postcss.config.js \
     quasar.config.js \
     tsconfig.json \
     ./
RUN --mount=type=secret,id=GHP_AUTH_TOKEN \
    GHP_AUTH_TOKEN=$(cat /run/secrets/GHP_AUTH_TOKEN) yarn run quasar build --mode spa


FROM busybox:1.36.1

COPY --from=frontend-builder /usr/src/app/dist/spa /site

COPY docker-run.sh /usr/local/bin/

VOLUME [ "/srv/www" ]

CMD [ "/usr/local/bin/docker-run.sh" ]
