####################
### Development  ###
####################

.PHONY: dev_clean
dev_clean: ## Clean build artifacts
	$(call print_warning,Removing build artifacts)
	$(Q)rm -rf $(BUILD_DIR)
	$(call print_success,Build directory cleaned)

.PHONY: dev_debug_vars
dev_debug_vars: ## Print key variables
	$(call print_info_section,Debug variables)
	$(Q)printf "ROOT_DIR=%s\nBUILD_DIR=%s\nDIST_DIR=%s\nTMP_DIR=%s\n" "$(ROOT_DIR)" "$(BUILD_DIR)" "$(DIST_DIR)" "$(TMP_DIR)"
