# EDSA — Educational Story Adventure

# Load .env if it exists
-include .env
export

# Database config (override via .env)
DB_NAME    ?= edsa
DB_USER    ?= edsa
DB_PASS    ?= edsa_secret
DB_PORT    ?= 5432
DB_CONTAINER = edsa-postgres

.PHONY: dev dev-app db-up db-down db-reset db-logs db-migrate db-seed db-studio

## Start everything: database + migrations + Next.js dev server
dev: db-up db-migrate dev-app

## Run Next.js dev server only
dev-app:
	npx next dev

## Start PostgreSQL container
db-up:
	@docker start $(DB_CONTAINER) 2>/dev/null || \
	docker run -d \
		--name $(DB_CONTAINER) \
		-e POSTGRES_DB=$(DB_NAME) \
		-e POSTGRES_USER=$(DB_USER) \
		-e POSTGRES_PASSWORD=$(DB_PASS) \
		-p $(DB_PORT):5432 \
		-v edsa_pgdata:/var/lib/postgresql/data \
		postgres:16-alpine
	@echo "PostgreSQL running on port $(DB_PORT)"
	@echo "Waiting for PostgreSQL to be ready..."
	@for i in 1 2 3 4 5 6 7 8 9 10; do \
		docker exec $(DB_CONTAINER) pg_isready -U $(DB_USER) >/dev/null 2>&1 && break; \
		sleep 1; \
	done

## Stop PostgreSQL container
db-down:
	docker stop $(DB_CONTAINER)

## Stop, remove container and volume, then restart fresh
db-reset:
	-docker stop $(DB_CONTAINER)
	-docker rm $(DB_CONTAINER)
	-docker volume rm edsa_pgdata
	@$(MAKE) db-up

## Run Prisma migrations
db-migrate:
	npx prisma generate
	npx prisma migrate dev

## Seed the database
db-seed:
	npx prisma db seed

## Open Prisma Studio
db-studio:
	npx prisma studio

## Tail PostgreSQL container logs
db-logs:
	docker logs -f $(DB_CONTAINER)
