##########################
### Extension Build    ###
##########################

# Extension metadata
EXTENSION_NAME := grove-extension
VERSION := 1.0.0

# Build artifacts
ZIP_FILE := $(BUILD_DIR)/$(EXTENSION_NAME)-v$(VERSION).zip

# Files to include in extension
INCLUDE_FILES := \
	manifest.json \
	popup.html \
	popup.css \
	popup.js \
	README.md \
	icons \
	src

# Files to exclude from zip
EXCLUDE_PATTERNS := \
	.git \
	.DS_Store \
	*.log \
	node_modules \
	poc \
	makefiles \
	logo.png \
	package*.json \
	Makefile \
	$(BUILD_DIR)

.PHONY: build_zip_extension
build_zip_extension: clean_build $(BUILD_DIR) ## Create extension zip for Chrome Web Store
	$(call print_info_section,Building Grove Extension v$(VERSION))
	$(call print_info,Creating zip file: $(ZIP_FILE))
	$(Q)zip -r $(ZIP_FILE) $(INCLUDE_FILES) -x $(EXCLUDE_PATTERNS)
	$(call print_success,Extension packaged successfully!)
	@printf "$(CYAN)$(BOLD)📦 Output:$(RESET) $(ZIP_FILE)\n"
	@printf "\n"
	@printf "$(YELLOW)$(BOLD)Next steps:$(RESET)\n"
	@printf "  1. Go to $(CYAN)https://chrome.google.com/webstore/devconsole$(RESET)\n"
	@printf "  2. Upload $(CYAN)$(ZIP_FILE)$(RESET)\n"
	@printf "\n"

.PHONY: clean_build
clean_build: ## Clean build artifacts
	$(call print_warning,Removing build artifacts)
	$(Q)rm -rf $(BUILD_DIR)
	$(call print_success,Build directory cleaned)
