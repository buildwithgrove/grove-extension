##########################
### Build & Quality    ###
##########################

.PHONY: build_prod
build_prod: ## Create production bundle
	$(call print_info_section,Building production bundle)
	$(Q)$(NPM) run build
	$(call print_success,Build complete - output in dist/)

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
