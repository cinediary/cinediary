# Atalhos para quem tem make (macOS, Linux, WSL). Sem make (Windows), use os mesmos nomes com npm:
# `npm run dev`, `npm run back`, `npm run front`… Os dois chamam scripts/dev.mjs (Node), que roda em qualquer sistema.
.DEFAULT_GOAL := help

.PHONY: help dev back front build-dev stop logs-api rebuild-api

help: ## Lista os comandos
	@node -e "require('fs').readFileSync('Makefile','utf8').split('\n').forEach(l=>{const m=l.match(/^([a-z-]+):.*?## (.*)/);if(m)console.log('  '+m[1].padEnd(12)+' '+m[2])})"

dev: ## Confere o ambiente, sobe banco + API (Docker) + Svix e abre o Expo (DEV_CLIENT=1: no development build)
	@node scripts/dev.mjs dev

back: ## Só o backend: banco + API (Docker) e o Svix neste terminal (Ctrl+C fecha só o Svix)
	@node scripts/dev.mjs back

front: ## Só o app: abre o Expo apontando para a API local (o backend continua rodando)
	@node scripts/dev.mjs front

build-dev: ## Gera o development build no EAS (PLATFORM=ios|android, SIMULATOR=1 para o simulador do iOS)
	@node scripts/dev.mjs build-dev

stop: ## Para banco, Neo4j e a API
	@node scripts/dev.mjs stop

logs-api: ## Acompanha os logs da API (container)
	@node scripts/dev.mjs logs-api

rebuild-api: ## Reempacota e reinicia só a API (depois de mudar o backend)
	@node scripts/dev.mjs rebuild-api
