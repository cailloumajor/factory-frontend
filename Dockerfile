FROM --platform=$BUILDPLATFORM denoland/deno:2.8.1 AS builder

WORKDIR /usr/local/src/app

RUN --mount=type=cache,target=/deno-dir \
    --mount=type=bind,source=deno.jsonc,target=deno.jsonc \
    --mount=type=bind,source=deno.lock,target=deno.lock \
    --mount=type=bind,source=client.ts,target=client.ts \
    --mount=type=bind,source=main.ts,target=main.ts \
    --mount=type=bind,source=vite.config.ts,target=vite.config.ts \
    --mount=type=bind,source=assets,target=assets \
    --mount=type=bind,source=components,target=components \
    --mount=type=bind,source=hooks,target=hooks \
    --mount=type=bind,source=islands,target=islands \
    --mount=type=bind,source=locales,target=locales \
    --mount=type=bind,source=routes,target=routes \
    --mount=type=bind,source=static,target=static \
    --mount=type=bind,source=utils,target=utils \
    deno ci --prod --skip-types && \
    deno task build


FROM denoland/deno:distroless-2.8.1

WORKDIR /app

COPY --from=builder /usr/local/src/app/_fresh _fresh
COPY healthcheck.ts /healthcheck.ts

HEALTHCHECK --timeout=5s CMD ["deno", "run", "--allow-net=127.0.0.1", "/healthcheck.ts"]

EXPOSE 8000

CMD ["serve", "--allow-env", "--allow-net", "--allow-read", "--no-prompt", "_fresh/server.js"]
