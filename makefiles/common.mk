############################
### Shell & Make Config  ###
############################

SHELL := /bin/bash
.SHELLFLAGS := -eu -o pipefail -c
MAKEFLAGS += --warn-undefined-variables
MAKEFLAGS += --no-builtin-rules

# VERBOSE=1 to show commands
ifdef VERBOSE
	Q :=
else
	Q := @
endif

############################
### Common Variables     ###
############################

TIMESTAMP := $(shell date '+%Y-%m-%d %H:%M:%S')
ROOT_DIR := $(shell pwd)
BUILD_DIR := $(ROOT_DIR)/build
DIST_DIR := $(ROOT_DIR)/dist
DOCS_DIR := $(ROOT_DIR)/docs
TMP_DIR := $(ROOT_DIR)/tmp

############################
### Helper Functions     ###
############################

define check_command
	@command -v $(1) >/dev/null 2>&1 || { \
		printf "$(RED)$(CROSS) Missing tool: $(1)$(RESET)\n"; \
		exit 1; \
	}
endef

define require-%
	@if [ -z "$($*)" ]; then \
		printf "$(RED)$(CROSS) Missing required variable: $*$(RESET)\n"; \
		exit 1; \
	fi
endef

.PHONY: prompt_confirm
prompt_confirm: ## Prompt before continuing
	@printf "$(YELLOW)Continue? [y/N] $(RESET)"; read ans; [ $${ans:-N} = y ]

.PHONY: debug_vars
debug_vars: ## Print key variables
	$(call print_info_section,Debug variables)
	$(Q)printf "ROOT_DIR=%s\nBUILD_DIR=%s\nDIST_DIR=%s\nTMP_DIR=%s\n" "$(ROOT_DIR)" "$(BUILD_DIR)" "$(DIST_DIR)" "$(TMP_DIR)"
	$(Q)printf "NPM=%s\n" "$(NPM)"
