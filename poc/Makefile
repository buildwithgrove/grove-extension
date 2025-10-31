#########################
### Makefile (root)   ###
#########################

.DEFAULT_GOAL := help

# NPM package manager (default: npm)
NPM ?= npm

# Patterns for classified help categories
HELP_PATTERNS := \
	'^help:' \
	'^env_.*:' \
	'^dev_.*:' \
	'^build_.*:' \
	'^clean_.*:' \
	'^debug_vars:'

.PHONY: help
help: ## Show all available targets with descriptions
	@printf "\n"
	@printf "$(BOLD)$(CYAN)📋 Grove Extension - Makefile Targets$(RESET)\n"
	@printf "\n"
	@printf "$(BOLD)=== 🚀 Quickstart ===$(RESET)\n"
	@grep -h -E '^(quickstart|setup):.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "$(CYAN)%-30s$(RESET) %s\n", $$1, $$2}'
	@printf "\n"
	@printf "$(BOLD)=== 🔧 Environment ===$(RESET)\n"
	@grep -h -E '^env_.*:.*?## .*$$' $(MAKEFILE_LIST) ./makefiles/*.mk 2>/dev/null | awk 'BEGIN {FS = ":.*?## "}; {printf "$(CYAN)%-30s$(RESET) %s\n", $$1, $$2}' | sort -u
	@printf "\n"
	@printf "$(BOLD)=== 🛠️ Development ===$(RESET)\n"
	@grep -h -E '^dev_.*:.*?## .*$$' $(MAKEFILE_LIST) ./makefiles/*.mk 2>/dev/null | awk 'BEGIN {FS = ":.*?## "}; {printf "$(CYAN)%-30s$(RESET) %s\n", $$1, $$2}' | sort -u
	@printf "\n"
	@printf "$(BOLD)=== 📦 Build ===$(RESET)\n"
	@grep -h -E '^build_.*:.*?## .*$$' $(MAKEFILE_LIST) ./makefiles/*.mk 2>/dev/null | awk 'BEGIN {FS = ":.*?## "}; {printf "$(CYAN)%-30s$(RESET) %s\n", $$1, $$2}' | sort -u
	@printf "\n"
	@printf "$(BOLD)=== 🧹 Cleaning ===$(RESET)\n"
	@grep -h -E '^clean_.*:.*?## .*$$' $(MAKEFILE_LIST) ./makefiles/*.mk 2>/dev/null | awk 'BEGIN {FS = ":.*?## "}; {printf "$(CYAN)%-30s$(RESET) %s\n", $$1, $$2}' | sort -u
	@printf "\n"
	@printf "$(YELLOW)Usage:$(RESET) make <target>\n"
	@printf "\n"

.PHONY: help-unclassified
help-unclassified: ## Show all unclassified targets
	@printf "\n"
	@printf "$(BOLD)$(CYAN)📦 Unclassified Targets$(RESET)\n"
	@printf "\n"
	@grep -h -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) ./makefiles/*.mk 2>/dev/null | sed 's/:.*//g' | sort -u > /tmp/all_targets.txt
	@( \
		for pattern in $(HELP_PATTERNS); do \
			grep -h -E "$pattern.*?## .*\$$" $(MAKEFILE_LIST) ./makefiles/*.mk 2>/dev/null || true; \
		done \
	) | sed 's/:.*//g' | sort -u > /tmp/classified_targets.txt
	@comm -23 /tmp/all_targets.txt /tmp/classified_targets.txt | while read target; do \
		grep -h -E "^$$target:.*?## .*\$$" $(MAKEFILE_LIST) ./makefiles/*.mk 2>/dev/null | awk 'BEGIN {FS = ":.*?## "}; {printf "$(CYAN)%-30s$(RESET) %s\n", $$1, $$2}'; \
	done
	@rm -f /tmp/all_targets.txt /tmp/classified_targets.txt
	@printf "\n"

################
### Imports  ###
################

include ./makefiles/colors.mk
include ./makefiles/common.mk
include ./makefiles/env.mk
include ./makefiles/dev.mk
include ./makefiles/build.mk

############################
### Quickstart Targets   ###
############################

.PHONY: quickstart
quickstart: setup ## Install dependencies and build once

.PHONY: setup
setup: ## Install deps and create production build
	$(call print_info_section,Running quickstart setup)
	$(Q)$(NPM) install
	$(Q)$(NPM) run build
	$(call print_success,Setup complete)

############################
### Legacy Target Aliases ##
############################

# Maintain backwards compatibility with existing targets

.PHONY: dev
dev: dev_start ## (Legacy) Start Vite dev server

.PHONY: run_dev
run_dev: dev_start ## (Legacy) Alias for dev

.PHONY: preview
preview: dev_preview ## (Legacy) Preview production build

.PHONY: lint
lint: dev_lint ## (Legacy) Run ESLint

.PHONY: test
test: dev_test ## (Legacy) Run tests

.PHONY: build
build: build_prod ## (Legacy) Create production bundle

.PHONY: clean
clean: clean_dist ## (Legacy) Remove dist/ output

###############################
###  Global Error Handling  ###
###############################

# Catch-all for undefined targets - MUST be at END after all includes
%:
	@echo ""
	@echo "$(RED)❌ Error: Unknown target '$(BOLD)$@$(RESET)$(RED)'$(RESET)"
	@echo ""
	@echo "$(YELLOW)💡 Available targets:$(RESET)"
	@echo "   Run $(CYAN)make help$(RESET) to see all available targets"
	@echo ""
	@exit 1
