##########################
### Shell Configuration ##
##########################

SHELL := /bin/bash
.SHELLFLAGS := -eu -o pipefail -c
MAKEFLAGS += --warn-undefined-variables
MAKEFLAGS += --no-builtin-rules

##########################
### Verbosity Control  ###
##########################

# VERBOSE=1 to show full command output
ifdef VERBOSE
	Q :=
else
	Q := @
endif

##########################
### Project Directories ##
##########################

TIMESTAMP := $(shell date '+%Y-%m-%d %H:%M:%S')
ROOT_DIR := $(shell pwd)
SRC_DIR := $(ROOT_DIR)/src
DIST_DIR := $(ROOT_DIR)/dist
PUBLIC_DIR := $(ROOT_DIR)/public
NODE_MODULES := $(ROOT_DIR)/node_modules

##########################
### Guard Functions    ###
##########################

# Check if a command exists
define check_command
	@command -v $(1) >/dev/null 2>&1 || { \
		printf "$(RED)$(CROSS) Missing required tool: $(BOLD)$(1)$(RESET)\n"; \
		printf "$(YELLOW)  Please install $(1) to continue$(RESET)\n"; \
		exit 1; \
	}
endef

# Check if node_modules exists
define check_node_modules
	@if [ ! -d "$(NODE_MODULES)" ]; then \
		printf "$(RED)$(CROSS) Dependencies not installed!$(RESET)\n"; \
		printf "$(YELLOW)  Run: $(CYAN)make env_install$(RESET)\n"; \
		exit 1; \
	fi
endef

# Check if dist directory exists
define check_dist
	@if [ ! -d "$(DIST_DIR)" ]; then \
		printf "$(RED)$(CROSS) Build directory not found!$(RESET)\n"; \
		printf "$(YELLOW)  Run: $(CYAN)make build_prod$(RESET)\n"; \
		exit 1; \
	fi
endef

# Require a variable to be set
define require-%
	@if [ -z "$($*)" ]; then \
		printf "$(RED)$(CROSS) Missing required variable: $(BOLD)$*$(RESET)\n"; \
		exit 1; \
	fi
endef

##########################
### Utility Targets    ###
##########################

.PHONY: prompt_confirm
prompt_confirm: ## Prompt before continuing
	@printf "$(YELLOW)Continue? [y/N] $(RESET)"; read ans; [ $${ans:-N} = y ]

.PHONY: debug_vars
debug_vars: ## Print key variables for debugging
	$(call print_info_section,Debug variables)
	@printf "$(CYAN)ROOT_DIR$(RESET)         = %s\n" "$(ROOT_DIR)"
	@printf "$(CYAN)SRC_DIR$(RESET)          = %s\n" "$(SRC_DIR)"
	@printf "$(CYAN)DIST_DIR$(RESET)         = %s\n" "$(DIST_DIR)"
	@printf "$(CYAN)PUBLIC_DIR$(RESET)       = %s\n" "$(PUBLIC_DIR)"
	@printf "$(CYAN)NODE_MODULES$(RESET)     = %s\n" "$(NODE_MODULES)"
	@printf "$(CYAN)NODE_VERSION$(RESET)     = %s\n" "$$(node --version 2>/dev/null || echo 'not installed')"
	@printf "$(CYAN)NPM_VERSION$(RESET)      = %s\n" "$$(npm --version 2>/dev/null || echo 'not installed')"
