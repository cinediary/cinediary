SHELL := /bin/bash
.DEFAULT_GOAL := help

# Carrega variáveis do .env se existir
ifneq (,$(wildcard .env))
include .env
export
endif

.PHONY: help db-ui up down logs psql cypher run build test clean reset-db

help: ## Lista os comandos
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-10s\033[0m %s\n", $$1, $$2}'

db-ui: ## Abre a interface web do banco (pgweb) em http://localhost:8082
	docker compose up -d db-ui && open http://localhost:8082

up: ## Sobe o PostgreSQL 17 e o Neo4j 5 + GDS
	docker compose up -d --wait

down: ## Para os containers
	docker compose down

logs: ## Logs do PostgreSQL e do Neo4j
	docker compose logs -f postgres neo4j

psql: ## Abre o psql no banco local
	docker compose exec postgres psql -U $${DB_USER:-cinediary} -d $${DB_NAME:-cinediary}

cypher: ## Abre o cypher-shell no Neo4j (grafo do Taste Match)
	docker compose exec neo4j cypher-shell -u $${NEO4J_USER:-neo4j} -p $${NEO4J_PASSWORD:-cinediary-neo4j}

run: up ## Sobe o banco e roda a API em http://localhost:8080
	./gradlew bootRun

build: ## Compila e gera o jar
	./gradlew build -x test

test: ## Testes: ArchUnit + integração (Testcontainers: PostgreSQL e Neo4j + GDS; precisa do Docker)
	@host="$${DOCKER_HOST:-$$(docker context inspect --format '{{.Endpoints.docker.Host}}' 2>/dev/null)}"; \
	if [ -n "$$host" ]; then export DOCKER_HOST="$$host"; echo "Docker: $$host"; fi; \
	case "$$host" in *orbstack*|*colima*) \
		export TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE="$${TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE:-/var/run/docker.sock}";; \
	esac; \
	./gradlew test $(ARGS)

clean: ## Limpa o build
	./gradlew clean

reset-db: ## Apaga os volumes do PostgreSQL e do Neo4j e sobe de novo (DESTRUTIVO)
	docker compose down -v && docker compose up -d --wait
