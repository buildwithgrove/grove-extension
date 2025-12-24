####################
### Development  ###
####################

.PHONY: dev_start
dev_start: ## Show instructions to load extension in Chrome
	$(call print_info_section,Loading Extension in Chrome)
	@printf "$(CYAN)$(INFO) 1. Open chrome://extensions/ in Chrome$(RESET)\n"
	@printf "$(CYAN)$(INFO) 2. Enable Developer mode (top right toggle)$(RESET)\n"
	@printf "$(CYAN)$(INFO) 3. Click Load unpacked and select this directory$(RESET)\n"
	@printf "$(CYAN)$(INFO) 4. Extension will reload on file changes (click refresh)$(RESET)\n"

.PHONY: dev_test
dev_test: ## Run Vitest tests
	$(call print_info_section,Running tests)
	$(Q)$(NPM) run test

.PHONY: dev_test_watch
dev_test_watch: ## Run tests in watch mode
	$(call print_info_section,Running tests in watch mode)
	$(Q)$(NPM) run test:watch

.PHONY: dev_test_coverage
dev_test_coverage: ## Run tests with coverage
	$(call print_info_section,Running tests with coverage)
	$(Q)$(NPM) run test:coverage

.PHONY: dev_test_e2e
dev_test_e2e: ## Run Playwright E2E tests
	$(call print_info_section,Running E2E tests)
	$(Q)$(NPM) run test:e2e

.PHONY: dev_lint
dev_lint: ## Run ESLint (not yet configured)
	$(call print_warning,ESLint not yet configured in package.json)
	@printf "$(CYAN)$(INFO) Add lint script to package.json to enable$(RESET)\n"

.PHONY: dev_preview
dev_preview: ## Preview production build (not applicable for extensions)
	$(call print_warning,Not applicable for browser extensions)
	$(call print_info,Use dev_start to load the extension directly in Chrome)

.PHONY: dev_clean
dev_clean: ## Clean build artifacts
	$(call print_warning,Removing build artifacts)
	$(Q)rm -rf $(BUILD_DIR)
	$(call print_success,Build directory cleaned)

.PHONY: dev_debug_vars
dev_debug_vars: ## Print key variables
	$(call print_info_section,Debug variables)
	$(Q)printf "ROOT_DIR=%s\nBUILD_DIR=%s\nDIST_DIR=%s\nTMP_DIR=%s\n" "$(ROOT_DIR)" "$(BUILD_DIR)" "$(DIST_DIR)" "$(TMP_DIR)"
