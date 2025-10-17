####################
### Development  ###
####################

.PHONY: _dev_urls
_dev_urls:
	$(Q)printf "$(CYAN)$(INFO) Vite dev server: http://localhost:5173/popup.html$(RESET)\n"
	$(Q)printf "$(CYAN)$(INFO) Options page:    http://localhost:5173/options.html$(RESET)\n"

.PHONY: dev_start
dev_start: ## Start Vite development server
	@$(MAKE) _dev_urls
	$(call print_info_section,Starting Vite development server)
	$(Q)$(NPM) run dev

.PHONY: dev_preview
dev_preview: ## Preview production build
	$(call print_info_section,Previewing production build)
	$(Q)$(NPM) run preview

.PHONY: dev_lint
dev_lint: ## Run ESLint
	$(call print_info_section,Running ESLint)
	$(Q)$(NPM) run lint
	$(call print_success,Linting complete)

.PHONY: dev_test
dev_test: ## Run tests (placeholder)
	$(call print_warning,Tests not yet implemented)
