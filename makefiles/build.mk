##########################
### Extension Build    ###
##########################

# Extension metadata
EXTENSION_NAME := grove-extension
VERSION := 1.1.0
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
	makefiles \
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

# Prompt to bump version with menu of options
.PHONY: _prompt_version_bump
_prompt_version_bump:
	@CURRENT_VERSION=$$(grep '"version"' manifest.json | sed 's/.*: "\([^"]*\)".*/\1/'); \
	MAJOR=$$(echo $$CURRENT_VERSION | cut -d. -f1); \
	MINOR=$$(echo $$CURRENT_VERSION | cut -d. -f2); \
	PATCH=$$(echo $$CURRENT_VERSION | cut -d. -f3); \
	BUILD=$$(echo $$CURRENT_VERSION | cut -d. -f4); \
	V_MAJOR="$$((MAJOR + 1)).0.0"; \
	V_MINOR="$$MAJOR.$$((MINOR + 1)).0"; \
	V_PATCH="$$MAJOR.$$MINOR.$$((PATCH + 1))"; \
	if [ -n "$$BUILD" ]; then \
		V_BUILD="$$MAJOR.$$MINOR.$$PATCH.$$((BUILD + 1))"; \
	else \
		V_BUILD="$$MAJOR.$$MINOR.$$PATCH.1"; \
	fi; \
	printf "\n"; \
	printf "$(BOLD)Current version:$(RESET) $$CURRENT_VERSION\n"; \
	printf "\n"; \
	printf "$(YELLOW)Version bump:$(RESET)\n"; \
	printf "  $(CYAN)[1]$(RESET) Major: $$CURRENT_VERSION → $$V_MAJOR\n"; \
	printf "  $(CYAN)[2]$(RESET) Minor: $$CURRENT_VERSION → $$V_MINOR\n"; \
	printf "  $(CYAN)[3]$(RESET) Patch: $$CURRENT_VERSION → $$V_PATCH\n"; \
	printf "  $(CYAN)[4]$(RESET) Build: $$CURRENT_VERSION → $$V_BUILD\n"; \
	printf "  $(CYAN)[s]$(RESET) Skip\n"; \
	printf "\n"; \
	printf "$(YELLOW)Choose [1/2/3/4/s]: $(RESET)"; \
	read choice; \
	case "$$choice" in \
		1) NEW_VERSION="$$V_MAJOR" ;; \
		2) NEW_VERSION="$$V_MINOR" ;; \
		3) NEW_VERSION="$$V_PATCH" ;; \
		4) NEW_VERSION="$$V_BUILD" ;; \
		s|S) printf "$(DIM)Skipping version bump$(RESET)\n"; exit 0 ;; \
		*) printf "$(RED)Invalid choice$(RESET)\n"; exit 1 ;; \
	esac; \
	printf "$(GREEN)New version:$(RESET) $$NEW_VERSION\n"; \
	sed "s/\"version\": \"$$CURRENT_VERSION\"/\"version\": \"$$NEW_VERSION\"/" manifest.json > manifest.json.tmp && mv manifest.json.tmp manifest.json; \
	sed "s/^VERSION := [0-9]*\.[0-9]*\.[0-9]*\(\.[0-9]*\)\{0,1\}/VERSION := $$NEW_VERSION/" makefiles/build.mk > makefiles/build.mk.tmp && mv makefiles/build.mk.tmp makefiles/build.mk; \
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
	@printf "\n"

.PHONY: build_release
build_release: _prompt_version_bump _build_extension_zip ## Build release zip for Chrome Web Store
	@printf "$(YELLOW)$(BOLD)Next steps:$(RESET)\n"
	@printf "  1. Go to $(CYAN)$(CHROME_STORE_CONSOLE)$(RESET)\n"
	@printf "  2. Ensure you are logged in with the group publisher.\n"
	@NEW_ZIP=$$(ls -t $(BUILD_DIR)/grove-extension-v*.zip 2>/dev/null | head -1); \
	printf "  3. Upload $(CYAN)$$NEW_ZIP$(RESET)\n"
	@printf "\n"

##########################
### Release Workflow   ###
##########################

# Release tags and asset names (RELEASE_TAG is computed dynamically in the target)
RELEASE_ASSET := $(BUILD_DIR)/grove-extension.zip

# Chrome Web Store public key - produces extension ID: jheejecmpfgifgdodgipilpgfaiecndm
EXTENSION_PUBLIC_KEY := MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA7nXN5llSn+XJEapNFnNEZ8kvEo1iEVFmG3dpj238FZOowzwGTMNuGBdV6F7UZxLuZUN5q4X2GZPL9K+ZHlVelpMv9wiRjNW1FuB5F2qi793NjqUXEIyi62nvK2roCLMVEeQ7hQ3+X6oO6fBxrnEMMLEquYjEDtj+BD0y4NOq65p/obb0p8T4xdPnE+s+/Vabi2hU4WQiPHDMBVL6b3OsnZPenEmsQUFI/vj8ZOC66oLb3qHNyuT58a8cqiVwpTggE/roSSM136eyn7Fioe8pez04jmidouMp+lHJ+YQCZ5s7SxJo8yqNh7vFWgP9MX1uRafpmVt4o1bJyjksF3VUXwIDAQAB

# Release notes template (VERSION_PLACEHOLDER replaced at runtime)
define RELEASE_NOTES
## Grove Extension vVERSION_PLACEHOLDER

### New Installation
1. Download the zip file below
2. Unzip to a folder
3. Go to `chrome://extensions`
4. Enable "Developer mode"
5. Click "Load unpacked" and select the unzipped folder

### Updating
1. Download the zip file below
2. Unzip (replace your existing folder or use a new one)
3. Go to `chrome://extensions`
4. Click the refresh icon on the Grove extension card
endef
export RELEASE_NOTES

.PHONY: build_beta
build_beta: ## Build and upload beta zip to GitHub releases
	@if ! command -v gh &> /dev/null; then \
		printf "$(RED)$(CROSS) GitHub CLI (gh) not installed. Run: brew install gh$(RESET)\n"; \
		exit 1; \
	fi
	@$(MAKE) _prompt_version_bump
	@$(MAKE) _grove_release_internal

.PHONY: _grove_release_internal
_grove_release_internal: _build_extension_zip
	@# Use the current version from manifest.json (already bumped by _prompt_version_bump)
	@RELEASE_VERSION=$$(grep '"version"' manifest.json | sed 's/.*: "\([^"]*\)".*/\1/'); \
	printf "$(CYAN)ℹ️  Creating release for v$$RELEASE_VERSION...$(RESET)\n"; \
	RELEASE_TAG="grove-extension-v$$RELEASE_VERSION"; \
	LOCAL_TAG="v$$RELEASE_VERSION"; \
	printf "\n"; \
	printf "$(YELLOW)%s$(RESET)\n" "╔════════════════════════════════════════════════════════╗"; \
	printf "$(YELLOW)║$(RESET)  $(BOLD)Release Version:$(RESET) $$RELEASE_VERSION\n"; \
	printf "$(YELLOW)║$(RESET)  $(BOLD)Release Tag:$(RESET)     $$RELEASE_TAG\n"; \
	printf "$(YELLOW)║$(RESET)  $(BOLD)Local Git Tag:$(RESET)   $$LOCAL_TAG\n"; \
	printf "$(YELLOW)%s$(RESET)\n" "╚════════════════════════════════════════════════════════╝"; \
	printf "\n"; \
	printf "$(CYAN)ℹ️  Preparing release zip with public key...$(RESET)\n"; \
	mkdir -p $(BUILD_DIR)/repack; \
	cp -r $(INCLUDE_FILES) $(BUILD_DIR)/repack/; \
	sed 's|"version": "[^"]*"|"version": "'$$RELEASE_VERSION'"|; s|"manifest_version": 3,|"manifest_version": 3,\n  "key": "$(EXTENSION_PUBLIC_KEY)",|' $(BUILD_DIR)/repack/manifest.json > $(BUILD_DIR)/repack/manifest.json.tmp && mv $(BUILD_DIR)/repack/manifest.json.tmp $(BUILD_DIR)/repack/manifest.json; \
	cd $(BUILD_DIR)/repack && zip -rq ../grove-extension-v$$RELEASE_VERSION.zip .; \
	rm -rf $(BUILD_DIR)/repack; \
	cp $(BUILD_DIR)/grove-extension-v$$RELEASE_VERSION.zip $(RELEASE_ASSET); \
	printf "\n"; \
	printf "$(CYAN)ℹ️  Creating local git tag $$LOCAL_TAG...$(RESET)\n"; \
	git tag -a $$LOCAL_TAG -m "Release $$RELEASE_VERSION" 2>/dev/null && \
		git push origin $$LOCAL_TAG && \
		printf "$(GREEN)$(CHECK) Tag $$LOCAL_TAG created and pushed$(RESET)\n" || \
		printf "$(YELLOW)$(WARN) Tag $$LOCAL_TAG already exists, skipping$(RESET)\n"; \
	printf "\n"; \
	printf "$(YELLOW)$(BOLD)━━━ Uploading to $(RELEASES_REPO) ━━━$(RESET)\n"; \
	printf "$(CYAN)ℹ️  Creating release $$RELEASE_TAG...$(RESET)\n"; \
	NOTES=$$(echo "$$RELEASE_NOTES" | sed "s/VERSION_PLACEHOLDER/$$RELEASE_VERSION/g"); \
	gh release create $$RELEASE_TAG $(RELEASE_ASSET) \
		--repo $(RELEASES_REPO) \
		--title "Grove Extension v$$RELEASE_VERSION" \
		--notes "$$NOTES" \
		--latest && \
		printf "$(GREEN)$(BOLD)$(CHECK) Release created!$(RESET)\n" || \
		{ printf "$(RED)$(CROSS) Failed to create release$(RESET)\n"; exit 1; }; \
	printf "\n"; \
	printf "$(GREEN)$(BOLD)🔗 Download URLs:$(RESET)\n"; \
	printf "   Latest:    $(CYAN)https://github.com/$(RELEASES_REPO)/releases/latest/download/grove-extension.zip$(RESET)\n"; \
	printf "   Versioned: $(CYAN)https://github.com/$(RELEASES_REPO)/releases/download/$$RELEASE_TAG/grove-extension.zip$(RESET)\n"; \
	printf "   Releases:  $(CYAN)https://github.com/$(RELEASES_REPO)/releases$(RESET)\n"; \
	printf "\n"
