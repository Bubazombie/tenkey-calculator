# Builds the frontend and the API, then runs both from one small image:
# the Go server answers /api/ and serves the built frontend.

FROM node:24-alpine AS frontend
WORKDIR /app
# Manifests first, so dependencies are cached until they change.
COPY package.json package-lock.json ./
COPY frontend/package.json frontend/
RUN npm ci --workspace frontend --include-workspace-root=false --ignore-scripts
COPY frontend/ frontend/
RUN npm run build --workspace frontend

FROM golang:1.27-alpine AS backend
WORKDIR /src
COPY backend/go.mod backend/go.sum ./
RUN go mod download
COPY backend/ ./
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/server ./cmd/server

FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=backend /out/server /server
COPY --from=frontend /app/frontend/dist /static
EXPOSE 8080
USER nonroot
ENTRYPOINT ["/server", "-addr", ":8080", "-static", "/static"]
