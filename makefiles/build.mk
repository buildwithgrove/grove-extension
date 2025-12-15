##########################
### Extension Build    ###
##########################

# Extension metadata
EXTENSION_NAME := grove-extension
VERSION := 1.0.5
GIT_SHA := $(shell git rev-parse --short HEAD)
VERSION_FULL := $(VERSION)-$(GIT_SHA)

# Chrome Web Store URLs
CHROME_STORE_CONSOLE := https://chrome.google.com/webstore/devconsole/21d27706-ef22-4f83-8ddc-9f6109acef7d/jheejecmpfgifgdodgipilpgfaiecndm/edit/package

# Public repo for hosting release downloads (must be public for shareable URLs)
RELEASES_REPO := buildwithgrove/grove-releases

# Build artifacts
ZIP_FILE := $(BUILD_DIR)/$(EXTENSION_NAME)-v$(VERSION_FULL).zip

# Files to include in extension
INCLUDE_FILES := \
	manifest.json \
	background.js \
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

# Internal target for building the zip (no instructions shown)
.PHONY: _build_extension_zip
_build_extension_zip: dev_clean $(BUILD_DIR)
	@printf "\n"
	@printf "$(YELLOW)%s$(RESET)\n" "╔════════════════════════════════════════════════════════╗"
	@printf "$(YELLOW)%s$(RESET)\n" "║  🌳 Building Grove Extension v$(VERSION_FULL)            ║"
	@printf "$(YELLOW)%s$(RESET)\n" "╚════════════════════════════════════════════════════════╝"
	@printf "\n"
	@# Copy files to staging directory and strip the "key" field from manifest
	$(call print_info,Preparing files for packaging...)
	$(Q)mkdir -p $(BUILD_DIR)/staging
	$(Q)cp -r $(INCLUDE_FILES) $(BUILD_DIR)/staging/
	@# Use cross-platform sed: create temp file, then move (works on both Linux and macOS)
	$(Q)sed '/"key":/d' $(BUILD_DIR)/staging/manifest.json > $(BUILD_DIR)/staging/manifest.json.tmp && mv $(BUILD_DIR)/staging/manifest.json.tmp $(BUILD_DIR)/staging/manifest.json
	$(call print_info,Creating zip file: $(ZIP_FILE))
	$(Q)cd $(BUILD_DIR)/staging && zip -rq ../$(EXTENSION_NAME)-v$(VERSION_FULL).zip .
	$(Q)rm -rf $(BUILD_DIR)/staging
	$(call print_success,Extension packaged successfully!)
	@printf "\n"
	@printf "$(GREEN)$(BOLD)📦 Output:$(RESET) $(CYAN)$(ZIP_FILE)$(RESET)\n"
	@printf "\n"

# Prompt to bump version (for Chrome Store releases)
.PHONY: _prompt_version_bump
_prompt_version_bump:
	@printf "$(YELLOW)Bump version before building? [Y/n] $(RESET)"; \
	read ans; \
	if [ "$${ans:-Y}" = "n" ] || [ "$${ans:-Y}" = "N" ]; then \
		printf "$(DIM)Skipping version bump$(RESET)\n"; \
	else \
		$(MAKE) _do_version_bump; \
	fi
	@printf "\n"

# Perform the actual version bump
.PHONY: _do_version_bump
_do_version_bump:
	@CURRENT_VERSION=$$(grep '"version"' manifest.json | sed 's/.*"\([0-9]*\.[0-9]*\.[0-9]*\)".*/\1/'); \
	MAJOR=$$(echo $$CURRENT_VERSION | cut -d. -f1); \
	MINOR=$$(echo $$CURRENT_VERSION | cut -d. -f2); \
	PATCH=$$(echo $$CURRENT_VERSION | cut -d. -f3); \
	NEW_PATCH=$$((PATCH + 1)); \
	NEW_VERSION="$$MAJOR.$$MINOR.$$NEW_PATCH"; \
	printf "$(CYAN)Current version:$(RESET) $$CURRENT_VERSION\n"; \
	printf "$(GREEN)New version:$(RESET) $$NEW_VERSION\n"; \
	sed "s/\"version\": \"$$CURRENT_VERSION\"/\"version\": \"$$NEW_VERSION\"/" manifest.json > manifest.json.tmp && mv manifest.json.tmp manifest.json; \
	sed "s/^VERSION := [0-9]*\.[0-9]*\.[0-9]*/VERSION := $$NEW_VERSION/" makefiles/build.mk > makefiles/build.mk.tmp && mv makefiles/build.mk.tmp makefiles/build.mk; \
	printf "$(GREEN)$(CHECK) Version bumped to $$NEW_VERSION$(RESET)\n"; \
	printf "\n"; \
	printf "$(YELLOW)Commit and push version bump? [Y/n] $(RESET)"; \
	read commit_ans; \
	if [ "$${commit_ans:-Y}" = "n" ] || [ "$${commit_ans:-Y}" = "N" ]; then \
		printf "$(DIM)Skipping commit$(RESET)\n"; \
	else \
		git add manifest.json makefiles/build.mk && \
		git commit -m "chore: bump version to $$NEW_VERSION" && \
		git push && \
		printf "$(GREEN)$(CHECK) Changes committed and pushed!$(RESET)\n"; \
	fi

.PHONY: build_chrome_store_zip
build_chrome_store_zip: _prompt_version_bump _build_extension_zip ## Create extension zip for Chrome Web Store
	@printf "$(YELLOW)$(BOLD)Next steps:$(RESET)\n"
	@printf "  1. Go to $(CYAN)$(CHROME_STORE_CONSOLE)$(RESET)\n"
	@printf "  2. Ensure you are logged in with the group publisher.\n"
	@NEW_ZIP=$$(ls -t $(BUILD_DIR)/grove-extension-v*.zip 2>/dev/null | head -1); \
	printf "  3. Upload $(CYAN)$$NEW_ZIP$(RESET)\n"
	@printf "\n"

##########################
### Release Workflow   ###
##########################

# Release tags and asset names
RELEASE_ASSET := $(BUILD_DIR)/grove-extension.zip
RELEASE_TAG := grove-extension-v$(VERSION_FULL)

# Chrome Web Store public key - produces extension ID: jheejecmpfgifgdodgipilpgfaiecndm
EXTENSION_PUBLIC_KEY := MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA7nXN5llSn+XJEapNFnNEZ8kvEo1iEVFmG3dpj238FZOowzwGTMNuGBdV6F7UZxLuZUN5q4X2GZPL9K+ZHlVelpMv9wiRjNW1FuB5F2qi793NjqUXEIyi62nvK2roCLMVEeQ7hQ3+X6oO6fBxrnEMMLEquYjEDtj+BD0y4NOq65p/obb0p8T4xdPnE+s+/Vabi2hU4WQiPHDMBVL6b3OsnZPenEmsQUFI/vj8ZOC66oLb3qHNyuT58a8cqiVwpTggE/roSSM136eyn7Fioe8pez04jmidouMp+lHJ+YQCZ5s7SxJo8yqNh7vFWgP9MX1uRafpmVt4o1bJyjksF3VUXwIDAQAB

.PHONY: build_and_upload_github_release_zip
build_and_upload_github_release_zip: _build_extension_zip ## Build and upload zip to public GitHub releases repo
	@# Re-inject the public key into the zip for stable extension ID when side-loading
	$(call print_info,Injecting public key for stable extension ID...)
	$(Q)mkdir -p $(BUILD_DIR)/repack
	$(Q)unzip -q $(ZIP_FILE) -d $(BUILD_DIR)/repack
	$(Q)sed 's|"manifest_version": 3,|"manifest_version": 3,\n  "key": "$(EXTENSION_PUBLIC_KEY)",|' $(BUILD_DIR)/repack/manifest.json > $(BUILD_DIR)/repack/manifest.json.tmp && mv $(BUILD_DIR)/repack/manifest.json.tmp $(BUILD_DIR)/repack/manifest.json
	$(Q)cd $(BUILD_DIR)/repack && zip -rq ../$(EXTENSION_NAME)-v$(VERSION_FULL).zip .
	$(Q)rm -rf $(BUILD_DIR)/repack
	$(call print_info_section,Uploading to $(RELEASES_REPO))
	@if ! command -v gh &> /dev/null; then \
		printf "$(RED)$(CROSS) GitHub CLI (gh) not installed. Run: brew install gh$(RESET)\n"; \
		exit 1; \
	fi
	@cp $(ZIP_FILE) $(RELEASE_ASSET)
	$(call print_info,Creating release $(RELEASE_TAG)...)
	@gh release create $(RELEASE_TAG) $(RELEASE_ASSET) \
		--repo $(RELEASES_REPO) \
		--title "Grove Extension v$(VERSION_FULL)" \
		--notes "Grove Extension v$(VERSION_FULL)" \
		--latest && \
		printf "$(GREEN)$(BOLD)$(CHECK) Release created!$(RESET)\n" || \
		{ printf "$(RED)$(WARN) Release already exists, skipping...$(RESET)\n"; }
	@printf "\n"
	@printf "$(GREEN)$(BOLD)🔗 Download URLs:$(RESET)\n"
	@printf "   Latest:    $(CYAN)https://github.com/$(RELEASES_REPO)/releases/latest/download/grove-extension.zip$(RESET)\n"
	@printf "   Versioned: $(CYAN)https://github.com/$(RELEASES_REPO)/releases/download/$(RELEASE_TAG)/grove-extension.zip$(RESET)\n"
	@printf "   Releases:  $(CYAN)https://github.com/$(RELEASES_REPO)/releases$(RESET)\n"
	@printf "\n"
