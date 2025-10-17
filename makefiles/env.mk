##########################
### Environment Setup  ###
##########################

.PHONY: env_check
env_check: ## Check if Node.js and npm are installed
	$(call print_info_section,Checking environment)
	$(call check_command,node)
	$(call check_command,npm)
	$(call print_success,Node.js v$$(node --version) and npm v$$(npm --version) are installed)

.PHONY: env_install
env_install: ## Install npm dependencies
	$(call print_info_section,Installing dependencies)
	$(call check_command,npm)
	$(Q)npm install
	$(call print_success,Dependencies installed)

.PHONY: env_install_ci
env_install_ci: ## Install dependencies for CI (clean install)
	$(call print_info_section,Installing dependencies (CI mode))
	$(call check_command,npm)
	$(Q)npm ci
	$(call print_success,Dependencies installed)

.PHONY: env_update
env_update: ## Update npm dependencies
	$(call print_info_section,Updating dependencies)
	$(call check_command,npm)
	$(Q)npm update
	$(call print_success,Dependencies updated)

.PHONY: env_outdated
env_outdated: ## Check for outdated dependencies
	$(call print_info_section,Checking for outdated packages)
	$(call check_command,npm)
	$(Q)npm outdated || true

.PHONY: clean_env
clean_env: ## Remove node_modules directory
	$(call print_warning,Removing node_modules)
	$(Q)rm -rf node_modules package-lock.json
	$(call print_success,Environment cleaned)
