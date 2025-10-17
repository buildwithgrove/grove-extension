##########################
### Build & Extension  ###
##########################

.PHONY: build_dev
build_dev: ## Build extension for development
	$(call check_node_modules)
	$(call print_info_section,Building extension (development mode))
	$(Q)npm run build
	$(call print_success,Development build complete → dist/)

.PHONY: build_prod
build_prod: build_dev ## Build extension for production (alias)

.PHONY: build_watch
build_watch: ## Build and watch for changes
	$(call check_node_modules)
	$(call print_info_section,Building extension with watch mode)
	$(Q)npx vite build --watch

.PHONY: ext_load_instructions
ext_load_instructions: ## Show instructions for loading extension in Chrome
	@printf "\n"
	@printf "$(BOLD)$(CYAN)📦 Loading Grove Extension in Chrome$(RESET)\n"
	@printf "\n"
	@printf "$(YELLOW)1.$(RESET) Open Chrome and navigate to: $(CYAN)chrome://extensions$(RESET)\n"
	@printf "$(YELLOW)2.$(RESET) Toggle $(BOLD)Developer mode$(RESET) (top-right corner)\n"
	@printf "$(YELLOW)3.$(RESET) Click $(BOLD)Load unpacked$(RESET)\n"
	@printf "$(YELLOW)4.$(RESET) Select the $(CYAN)$(DIST_DIR)$(RESET) directory\n"
	@printf "$(YELLOW)5.$(RESET) Pin the extension in the toolbar for easy access\n"
	@printf "\n"
	@printf "$(GREEN)$(CHECK)$(RESET) Extension ID will appear in the Chrome extensions page\n"
	@printf "\n"

.PHONY: ext_package
ext_package: clean_dist build_prod ## Package extension as ZIP for distribution
	$(call print_info_section,Packaging extension)
	$(Q)cd dist && zip -r ../grove-extension.zip . -x "*.DS_Store"
	$(call print_success,Extension packaged → grove-extension.zip)

.PHONY: ext_validate
ext_validate: ## Validate manifest and extension structure
	$(call check_dist)
	$(call print_info_section,Validating extension)
	@if [ ! -f "$(DIST_DIR)/manifest.json" ]; then \
		printf "$(RED)$(CROSS) manifest.json not found in dist/$(RESET)\n"; \
		exit 1; \
	fi
	@printf "$(GREEN)$(CHECK)$(RESET) manifest.json exists\n"
	@if [ ! -d "$(DIST_DIR)/icons" ]; then \
		printf "$(YELLOW)$(WARN) icons/ directory not found$(RESET)\n"; \
	else \
		printf "$(GREEN)$(CHECK)$(RESET) icons/ directory exists\n"; \
	fi
	$(call print_success,Extension validation complete)

.PHONY: clean_dist
clean_dist: ## Clean build output directory
	$(call print_warning,Removing dist directory)
	$(Q)rm -rf dist
	$(call print_success,Build directory cleaned)

.PHONY: clean_build
clean_build: clean_dist ## Alias for clean_dist

.PHONY: clean_package
clean_package: ## Remove packaged ZIP files
	$(call print_warning,Removing packaged files)
	$(Q)rm -f grove-extension.zip
	$(call print_success,Package files removed)

.PHONY: clean_all
clean_all: clean_env clean_dist clean_package ## Clean everything (node_modules, dist, packages)
	$(call print_success,Complete cleanup done)
