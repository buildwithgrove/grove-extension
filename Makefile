#########################
### Makefile (root)   ###
#########################

.DEFAULT_GOAL := help

# Patterns for classified help categories
HELP_PATTERNS := \
	'^help:' \
	'^build_.*:' \
	'^dev_.*:' \
	'^test_.*:'

.PHONY: help
help: ## Show all available targets with descriptions
	@printf "\n"
	@printf "$(BOLD)$(CYAN)📦 Grove Extension - Makefile Targets$(RESET)\n"
	@printf "$(YELLOW)Usage:$(RESET) make <target>\n"
	@printf "\n"
	@printf "$(BOLD)=== 📋 Information & Discovery ===$(RESET)\n"
	@grep -h -E '^(help|help-unclassified):.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "$(CYAN)%-42s$(RESET) %s\n", $$1, $$2}'
	@printf "\n"
	@printf "$(BOLD)=== 🏗️  Build & Package ===$(RESET)\n"
	@grep -h -E '^build_.*:.*?## .*$$' $(MAKEFILE_LIST) ./makefiles/*.mk 2>/dev/null | awk 'BEGIN {FS = ":.*?## "}; {printf "$(CYAN)%-42s$(RESET) %s\n", $$1, $$2}' | sort -u
	@printf "\n"
	@printf "$(BOLD)=== 🔧 Development ===$(RESET)\n"
	@grep -h -E '^dev_.*:.*?## .*$$' $(MAKEFILE_LIST) ./makefiles/*.mk 2>/dev/null | awk 'BEGIN {FS = ":.*?## "}; {printf "$(CYAN)%-42s$(RESET) %s\n", $$1, $$2}' | sort -u | awk '/force_inject/{held[++n]=$$0; next} {print} END{for(i=1;i<=n;i++) print held[i]}'
	@printf "\n"
	@printf "$(BOLD)=== 🧪 Testing ===$(RESET)\n"
	@grep -h -E '^test_.*:.*?## .*$$' $(MAKEFILE_LIST) ./makefiles/*.mk 2>/dev/null | awk 'BEGIN {FS = ":.*?## "}; {printf "$(CYAN)%-42s$(RESET) %s\n", $$1, $$2}' | sort -u
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
include ./makefiles/dev.mk
include ./makefiles/test.mk

############################
### Legacy Target Aliases ##
############################

# Maintain backwards compatibility with existing targets

.PHONY: zip_extension
zip_extension: build_release ## (Legacy) Create extension zip

.PHONY: clean
clean: dev_clean ## (Legacy) Clean build artifacts

###############################
###  Global Error Handling  ###
###############################

# Catch-all for undefined targets - MUST be at END after all includes
%:
	@printf "\n"
	@printf "$(RED)❌ Error: Unknown target '$(BOLD)$@$(RESET)$(RED)'$(RESET)\n"
	@printf "\n"
	@printf "$(YELLOW)💡 Available targets:$(RESET)\n"
	@printf "   Run $(CYAN)make help$(RESET) to see all available targets\n"
	@printf "\n"
	@exit 1
