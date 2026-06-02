#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage:
  scripts/docker_images.sh build <dockerhub-user-or-org> <tag>
  scripts/docker_images.sh push <dockerhub-user-or-org> <tag>
  scripts/docker_images.sh build-push <dockerhub-user-or-org> <tag>

Optional:
  DOCKER_PLATFORM=linux/amd64 scripts/docker_images.sh build <dockerhub-user-or-org> <tag>

Images:
  <namespace>/checkpoint-web:<tag>
  <namespace>/checkpoint-api-gateway:<tag>
  <namespace>/checkpoint-identity-service:<tag>
  <namespace>/checkpoint-service:<tag>
USAGE
}

if [ "$#" -ne 3 ]; then
  usage
  exit 2
fi

COMMAND="$1"
NAMESPACE="$2"
TAG="$3"

case "$COMMAND" in
  build|push|build-push)
    ;;
  *)
    usage
    exit 2
    ;;
esac

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PLATFORM_ARGS=()
if [ "${DOCKER_PLATFORM:-}" != "" ]; then
  PLATFORM_ARGS=(--platform "$DOCKER_PLATFORM")
fi

build_image() {
  local name="$1"
  local context="$2"
  docker build "${PLATFORM_ARGS[@]}" -t "${NAMESPACE}/${name}:${TAG}" "${ROOT_DIR}/${context}"
}

push_image() {
  local name="$1"
  docker push "${NAMESPACE}/${name}:${TAG}"
}

if [ "$COMMAND" = "build" ] || [ "$COMMAND" = "build-push" ]; then
  build_image checkpoint-web web
  build_image checkpoint-api-gateway services/api-gateway
  build_image checkpoint-identity-service services/identity-service
  build_image checkpoint-service services/checkpoint-service
fi

if [ "$COMMAND" = "push" ] || [ "$COMMAND" = "build-push" ]; then
  push_image checkpoint-web
  push_image checkpoint-api-gateway
  push_image checkpoint-identity-service
  push_image checkpoint-service
fi
