##########################
### Development Tools  ###
##########################

.PHONY: dev_server
dev_server: ## Start Vite development server
	$(call check_node_modules)
	$(call print_info_section,Starting development server)
	$(call print_info,Server will be available at http://localhost:5173)
	$(Q)npm run dev

.PHONY: dev_preview
dev_preview: ## Preview production build locally
	$(call check_node_modules)
	$(call check_dist)
	$(call print_info_section,Starting preview server)
	$(Q)npm run preview

##########################
### Quality Checks     ###
##########################

.PHONY: lint
lint: ## Run ESLint and auto-fix issues
	$(call check_node_modules)
	$(call print_info_section,Running ESLint with auto-fix)
	$(Q)npx eslint "src/**/*.{ts,tsx}" --fix
	$(call print_success,Linting complete)

.PHONY: format
format: ## Format code with Prettier
	$(call check_node_modules)
	$(call print_info_section,Formatting code with Prettier)
	$(Q)npx prettier --write "src/**/*.{ts,tsx,css}"
	$(call print_success,Code formatted)

.PHONY: check
check: ## Run all quality checks (format, lint, typecheck)
	$(call check_node_modules)
	$(call print_info_section,Running quality checks)
	@printf "$(CYAN)→ Checking code formatting...$(RESET)\n"
	$(Q)npx prettier --check "src/**/*.{ts,tsx,css}"
	@printf "$(GREEN)  ✓ Format check passed$(RESET)\n"
	@printf "$(CYAN)→ Running linter...$(RESET)\n"
	$(Q)npm run lint
	@printf "$(GREEN)  ✓ Linting passed$(RESET)\n"
	@printf "$(CYAN)→ Type checking...$(RESET)\n"
	$(Q)npx tsc --noEmit
	@printf "$(GREEN)  ✓ Type check passed$(RESET)\n"
	$(call print_success,All quality checks passed)

##########################
### Testing            ###
##########################

.PHONY: test
test: ## Run extension tests (placeholder - tests not yet implemented)
	$(call print_warning,No tests configured yet)
	@printf "$(YELLOW)  To add tests, consider:$(RESET)\n"
	@printf "    - Vitest for unit tests\n"
	@printf "    - Playwright for E2E testing\n"
	@printf "    - Chrome extension testing tools\n"

.PHONY: test_extension
test_extension: build_dev ## Test extension build and validation
	$(call print_info_section,Testing extension)
	@$(MAKE) --no-print-directory ext_validate
	$(call print_success,Extension validation passed)

##########################
### Legacy Aliases     ###
##########################

.PHONY: dev_lint
dev_lint: ## (Legacy) Run ESLint on TypeScript files
	$(call check_node_modules)
	$(call print_info_section,Running ESLint)
	$(Q)npm run lint
	$(call print_success,Linting complete)

.PHONY: dev_lint_fix
dev_lint_fix: lint ## (Legacy) Run ESLint with auto-fix

.PHONY: dev_format
dev_format: format ## (Legacy) Format code with Prettier

.PHONY: dev_format_check
dev_format_check: ## (Legacy) Check code formatting without making changes
	$(call check_node_modules)
	$(call print_info_section,Checking code formatting)
	$(Q)npx prettier --check "src/**/*.{ts,tsx,css}"
	$(call print_success,Formatting check passed)

.PHONY: dev_typecheck
dev_typecheck: ## (Legacy) Run TypeScript type checking
	$(call check_node_modules)
	$(call print_info_section,Running TypeScript type checker)
	$(Q)npx tsc --noEmit
	$(call print_success,Type checking complete)

.PHONY: dev_check_all
dev_check_all: check ## (Legacy) Run all quality checks
