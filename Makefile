#########################
### Makefile (root)   ###
#########################

.DEFAULT_GOAL := help

# Patterns for classified help categories
HELP_PATTERNS := \
	'^help:' \
	'^build_.*:' \
	'^clean_.*:' \
	'^debug_vars:'

.PHONY: help
help: ## Show all available targets with descriptions
	@printf "\n"
	@printf "$(BOLD)$(CYAN)📦 Grove Extension - Makefile Targets$(RESET)\n"
	@printf "\n"
	@printf "$(BOLD)=== 📋 Information & Discovery ===$(RESET)\n"
	@grep -h -E '^(help|help-unclassified):.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "$(CYAN)%-30s$(RESET) %s\n", $$1, $$2}'
	@printf "\n"
	@printf "$(BOLD)=== 🏗️  Build & Package ===$(RESET)\n"
	@grep -h -E '^build_.*:.*?## .*$$' $(MAKEFILE_LIST) ./makefiles/*.mk 2>/dev/null | awk 'BEGIN {FS = ":.*?## "}; {printf "$(CYAN)%-30s$(RESET) %s\n", $$1, $$2}' | sort -u
	@printf "\n"
	@printf "$(BOLD)=== 🧹 Cleaning ===$(RESET)\n"
	@grep -h -E '^clean_.*:.*?## .*$$' $(MAKEFILE_LIST) ./makefiles/*.mk 2>/dev/null | awk 'BEGIN {FS = ":.*?## "}; {printf "$(CYAN)%-30s$(RESET) %s\n", $$1, $$2}' | sort -u
	@printf "\n"
	@printf "$(BOLD)=== 🔧 Debugging ===$(RESET)\n"
	@grep -h -E '^debug_.*:.*?## .*$$' $(MAKEFILE_LIST) ./makefiles/*.mk 2>/dev/null | awk 'BEGIN {FS = ":.*?## "}; {printf "$(CYAN)%-30s$(RESET) %s\n", $$1, $$2}' | sort -u
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
			grep -h -E "$${pattern}.*?## .*\$$" $(MAKEFILE_LIST) ./makefiles/*.mk 2>/dev/null || true; \
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
include ./makefiles/build.mk

############################
### Legacy Target Aliases ##
############################

# Maintain backwards compatibility with existing targets

.PHONY: zip_extension
zip_extension: build_zip_extension ## (Legacy) Create extension zip

.PHONY: clean
clean: clean_build ## (Legacy) Clean build artifacts

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
