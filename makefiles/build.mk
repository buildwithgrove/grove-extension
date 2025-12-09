##########################
### Extension Build    ###
##########################

# Extension metadata
EXTENSION_NAME := grove-extension
VERSION := 1.0.3

# Chrome Web Store URLs
CHROME_STORE_CONSOLE := https://chrome.google.com/webstore/devconsole/21d27706-ef22-4f83-8ddc-9f6109acef7d/jheejecmpfgifgdodgipilpgfaiecndm/edit/package

# Public repo for hosting release downloads (must be public for shareable URLs)
RELEASES_REPO := buildwithgrove/grove-releases

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
	@printf "  1. Go to $(CYAN)$(CHROME_STORE_CONSOLE)$(RESET)\n"
	@printf "  2. Ensure you are logged in with the group publisher.\n"
	@printf "  3. Upload $(CYAN)$(ZIP_FILE)$(RESET)\n"
	@printf "\n"

.PHONY: clean_build
clean_build: ## Clean build artifacts
	$(call print_warning,Removing build artifacts)
	$(Q)rm -rf $(BUILD_DIR)
	$(call print_success,Build directory cleaned)

##########################
### Release Workflow   ###
##########################

.PHONY: build_release
build_release: ## Bump version, prompt to commit/push, and prepare for Chrome Web Store upload
	$(call print_info_section,Grove Extension Release)
	@# Extract current version from manifest.json
	$(eval CURRENT_VERSION := $(shell grep '"version"' manifest.json | sed 's/.*"\([0-9]*\.[0-9]*\.[0-9]*\)".*/\1/'))
	$(eval MAJOR := $(shell echo $(CURRENT_VERSION) | cut -d. -f1))
	$(eval MINOR := $(shell echo $(CURRENT_VERSION) | cut -d. -f2))
	$(eval PATCH := $(shell echo $(CURRENT_VERSION) | cut -d. -f3))
	$(eval NEW_PATCH := $(shell echo $$(($(PATCH) + 1))))
	$(eval NEW_VERSION := $(MAJOR).$(MINOR).$(NEW_PATCH))
	@printf "$(CYAN)Current version:$(RESET) $(CURRENT_VERSION)\n"
	@printf "$(GREEN)New version:$(RESET) $(NEW_VERSION)\n"
	@printf "\n"
	@# Update version in manifest.json
	$(call print_info,Updating manifest.json...)
	@sed -i '' 's/"version": "$(CURRENT_VERSION)"/"version": "$(NEW_VERSION)"/' manifest.json
	@# Update version in build.mk
	$(call print_info,Updating build.mk...)
	@sed -i '' 's/^VERSION := [0-9]*\.[0-9]*\.[0-9]*/VERSION := $(NEW_VERSION)/' makefiles/build.mk
	$(call print_success,Version bumped to $(NEW_VERSION))
	@printf "\n"
	@# Show git status
	@printf "$(BOLD)=== Git Status ===$(RESET)\n"
	@git status --short
	@printf "\n"
	@# Prompt for commit
	@printf "$(YELLOW)Would you like to commit and push these changes? [y/N] $(RESET)"; \
	read ans; \
	if [ "$${ans:-N}" = "y" ] || [ "$${ans:-N}" = "Y" ]; then \
		git add manifest.json makefiles/build.mk && \
		git commit -m "chore: bump version to $(NEW_VERSION)" && \
		git push && \
		printf "$(GREEN)$(CHECK) Changes committed and pushed!$(RESET)\n"; \
	else \
		printf "$(YELLOW)Skipping commit. Remember to commit manually.$(RESET)\n"; \
	fi
	@printf "\n"
	@printf "$(BOLD)=== Next Steps ===$(RESET)\n"
	@printf "\n"
	@printf "$(CYAN)1.$(RESET) Build the extension package:\n"
	@printf "   $(GREEN)make build_zip_extension$(RESET)\n"
	@printf "\n"
	@printf "$(CYAN)2.$(RESET) Upload to Chrome Web Store:\n"
	@printf "   $(BLUE)$(CHROME_STORE_CONSOLE)$(RESET)\n"
	@printf "\n"

# Release tags and asset names
RELEASE_ASSET := $(BUILD_DIR)/grove-extension.zip
GIT_SHA := $(shell git rev-parse --short HEAD)
RELEASE_TAG_VERSION := grove-extension-v$(VERSION)-$(GIT_SHA)
RELEASE_TAG_LATEST := grove-extension-latest

.PHONY: build_zip_upload
build_zip_upload: build_zip_extension ## Upload zip to public releases repo
	$(call print_info_section,Uploading to $(RELEASES_REPO))
	@if ! command -v gh &> /dev/null; then \
		printf "$(RED)$(CROSS) GitHub CLI (gh) not installed. Run: brew install gh$(RESET)\n"; \
		exit 1; \
	fi
	@cp $(ZIP_FILE) $(RELEASE_ASSET)
	$(call print_info,Creating versioned release $(RELEASE_TAG_VERSION)...)
	@gh release create $(RELEASE_TAG_VERSION) $(RELEASE_ASSET) \
		--repo $(RELEASES_REPO) \
		--title "Grove Extension v$(VERSION)-$(GIT_SHA)" \
		--notes "Grove Extension v$(VERSION)-$(GIT_SHA)" && \
		printf "$(GREEN)$(CHECK) Versioned release created!$(RESET)\n" || \
		{ printf "$(YELLOW)$(WARN) Versioned release already exists, skipping...$(RESET)\n"; }
	$(call print_info,Updating latest release...)
	@gh release delete $(RELEASE_TAG_LATEST) --repo $(RELEASES_REPO) --yes 2>/dev/null || true
	@gh release create $(RELEASE_TAG_LATEST) $(RELEASE_ASSET) \
		--repo $(RELEASES_REPO) \
		--title "Grove Extension v$(VERSION)-$(GIT_SHA) (Latest)" \
		--notes "Grove Extension v$(VERSION)-$(GIT_SHA) - Latest release" && \
		printf "$(GREEN)$(CHECK) Latest release updated!$(RESET)\n" || \
		{ printf "$(RED)$(CROSS) Failed to create latest release.$(RESET)\n"; exit 1; }
	@printf "\n$(CYAN)$(BOLD)🔗 Download URLs:$(RESET)\n"
	@printf "   Latest:    https://github.com/$(RELEASES_REPO)/releases/download/$(RELEASE_TAG_LATEST)/grove-extension.zip\n"
	@printf "   Versioned: https://github.com/$(RELEASES_REPO)/releases/download/$(RELEASE_TAG_VERSION)/grove-extension.zip\n"
