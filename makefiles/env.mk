##########################
### Environment Setup  ###
##########################

.PHONY: env_install
env_install: ## Install npm dependencies
	$(call print_info_section,Installing npm dependencies)
	$(Q)$(NPM) install
	$(call print_success,Dependencies installed)

.PHONY: env_check
env_check: ## Check if npm is available
	$(call check_command,$(NPM))
	$(call print_success,npm is available)
