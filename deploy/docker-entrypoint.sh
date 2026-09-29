#!/bin/sh
set -eu

media_root="${MEDIA_ROOT:-/var/lib/aksadata/media}"
mkdir -p "$media_root"
chown -R nextjs:nodejs "$media_root"

exec su-exec nextjs:nodejs "$@"
