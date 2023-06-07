#!/bin/sh

DOCKER_CMD="${DOCKER_CMD:-docker}"

echo "Using docker command: $DOCKER_CMD"

echo "Building container image to use for Apicurio Website development."
docker build -t apicurio/website-dev .
echo "Starting the Apicurio Website development container image."
docker run -it -p 8080:8080 -v $(pwd):/site:Z apicurio/website-dev
