#!/usr/bin/env sh
# docker 컨테이너 `postgres`에 DB `social_media`를 멱등 생성한다. 로컬 psql이 없어 docker exec로 접근.
set -eu

docker start postgres >/dev/null 2>&1 || true
until docker exec postgres pg_isready -U postgres >/dev/null 2>&1; do sleep 1; done
docker exec postgres psql -U postgres -tAc "SELECT 1 FROM pg_database WHERE datname='social_media'" | grep -q 1 \
  || docker exec postgres psql -U postgres -c 'CREATE DATABASE social_media'
