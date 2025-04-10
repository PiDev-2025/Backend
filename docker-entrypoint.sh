#!/bin/bash
set -e

# Ensure directories exist with correct permissions
mkdir -p "${NPM_CONFIG_CACHE:-/home/node/.npm}"
chown -R node:node "${NPM_CONFIG_CACHE:-/home/node/.npm}"
chown -R node:node /app

# Execute command with node user
exec gosu node "$@"
