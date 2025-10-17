##########################
### Build & Quality    ###
##########################

.PHONY: build_prod
build_prod: ## Create production bundle
	$(call print_info_section,Building production bundle)
	$(Q)$(NPM) run build
	$(call print_success,Build complete - output in dist/)

.PHONY: build_watch
build_watch: ## Build and watch for changes (use with chrome://extensions reload)
	$(call print_info_section,Building and watching for changes)
	$(call print_warning,After changes, click reload icon in chrome://extensions)
	$(Q)$(NPM) run build:watch

.PHONY: clean_dist
clean_dist: ## Remove dist/ output
	$(call print_warning,Removing dist/ directory)
	$(Q)rm -rf dist
	$(call print_success,dist/ removed)

.PHONY: clean_all
clean_all: clean_dist ## Clean all build artifacts
	$(call print_warning,Removing all build artifacts)
	$(Q)rm -rf node_modules
	$(call print_success,All build artifacts removed)
