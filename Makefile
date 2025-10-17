.DEFAULT_GOAL := help

NPM ?= npm

.PHONY: help quickstart setup dev build preview lint test clean run_dev _run_urls

help:
	@printf "=== 🚀 Quickstart ===\n"
	@printf "%-20s %s\n" "quickstart" "Install deps and build once"
	@printf "%-20s %s\n" "setup" "Alias for quickstart"
	@echo
	@printf "=== 🛠️ Development ===\n"
	@printf "%-20s %s\n" "dev" "Start Vite dev server (echo URLs)"
	@printf "%-20s %s\n" "run_dev" "Alias for dev"
	@printf "%-20s %s\n" "preview" "Preview production build"
	@echo
	@printf "=== 📦 Build ===\n"
	@printf "%-20s %s\n" "build" "Create production bundle"
	@printf "%-20s %s\n" "clean" "Remove dist/ output"
	@echo
	@printf "=== ✅ Quality ===\n"
	@printf "%-20s %s\n" "lint" "Run ESLint"
	@printf "%-20s %s\n" "test" "Placeholder test hook"
	@echo
	@printf "=== 📋 Other ===\n"
	@printf "%-20s %s\n" "help" "Show this help message"

quickstart: setup

setup:
	$(NPM) install
	$(NPM) run build

dev:
	@$(MAKE) _run_urls
	$(NPM) run dev

build:
	$(NPM) run build

preview:
	$(NPM) run preview

lint:
	$(NPM) run lint

test:
	@echo "Tests not yet implemented."

run_dev: dev

clean:
	rm -rf dist

_run_urls:
	@echo "Vite dev server: http://localhost:5173/popup.html"
	@echo "Options page:    http://localhost:5173/options.html"
