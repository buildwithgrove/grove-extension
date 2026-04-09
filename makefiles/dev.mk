####################
### Development  ###
####################

.PHONY: dev-start
dev-start: ## Show instructions to load extension in Chrome
	$(call print_info_section,Loading Extension in Chrome)
	@printf "$(CYAN)$(INFO) 1. Open chrome://extensions/ in Chrome$(RESET)\n"
	@printf "$(CYAN)$(INFO) 2. Enable Developer mode (top right toggle)$(RESET)\n"
	@printf "$(CYAN)$(INFO) 3. Click Load unpacked and select this directory$(RESET)\n"
	@printf "$(CYAN)$(INFO) 4. Extension will reload on file changes (click refresh)$(RESET)\n"

.PHONY: dev-clean
dev-clean: ## Clean build artifacts
	$(call print_warning,Removing build artifacts)
	$(Q)rm -rf $(BUILD_DIR) $(DIST_DIR) $(TMP_DIR)
	$(call print_success,Build directory cleaned)

.PHONY: dev-debug-vars
dev-debug-vars: ## Print key variables
	$(call print_info_section,Debug variables)
	$(Q)printf "ROOT_DIR=%s\nBUILD_DIR=%s\nDIST_DIR=%s\nTMP_DIR=%s\n" "$(ROOT_DIR)" "$(BUILD_DIR)" "$(DIST_DIR)" "$(TMP_DIR)"

.PHONY: dev-force-inject-on
dev-force-inject-on: ## Enable force-inject tip button (skips address resolution)
	$(call print_info_section,Enabling dev force-inject flag)
	$(Q)sed -i '' 's/forceInject: false/forceInject: true/' src/config/devFlags.js
	@echo "GROVE_DEV_FLAGS.forceInject = true — reload extension to apply"

.PHONY: dev-force-inject-off
dev-force-inject-off: ## Disable force-inject tip button (normal behavior)
	$(call print_info_section,Disabling dev force-inject flag)
	$(Q)sed -i '' 's/forceInject: true/forceInject: false/' src/config/devFlags.js
	@echo "GROVE_DEV_FLAGS.forceInject = false — reload extension to apply"
