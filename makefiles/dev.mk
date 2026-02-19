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

.PHONY: dev_force_inject_on
dev_force_inject_on: ## Enable force-inject tip button (skips address resolution)
	$(call print_info_section,Enabling dev force-inject flag)
	$(Q)sed -i '' 's/forceInject: false/forceInject: true/' src/config/devFlags.js
	@echo "GROVE_DEV_FLAGS.forceInject = true — reload extension to apply"

.PHONY: dev_force_inject_off
dev_force_inject_off: ## Disable force-inject tip button (normal behavior)
	$(call print_info_section,Disabling dev force-inject flag)
	$(Q)sed -i '' 's/forceInject: true/forceInject: false/' src/config/devFlags.js
	@echo "GROVE_DEV_FLAGS.forceInject = false — reload extension to apply"
