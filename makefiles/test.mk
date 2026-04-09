####################
###   Testing    ###
####################

# --- Unit tests (Vitest) ---

.PHONY: test-unit
test-unit: ## Run all Vitest unit tests
	$(call print_info_section,Running unit tests)
	$(Q)$(NPM) run test

.PHONY: test-unit-substack
test-unit-substack: ## Run Substack adapter unit tests
	$(call print_info_section,Running Substack unit tests)
	$(Q)$(NPM) exec vitest -- run tests/substack-adapter.test.js

.PHONY: test-unit-twitter
test-unit-twitter: ## Run Twitter adapter unit tests
	$(call print_info_section,Running Twitter unit tests)
	$(Q)$(NPM) exec vitest -- run tests/twitter-adapter.test.js tests/integration/twitter-flow.test.js

.PHONY: test-unit-soundcloud
test-unit-soundcloud: ## Run SoundCloud adapter unit tests
	$(call print_info_section,Running SoundCloud unit tests)
	$(Q)$(NPM) exec vitest -- run tests/soundcloud-adapter.test.js

.PHONY: test-unit-youtube
test-unit-youtube: ## Run YouTube adapter unit tests
	$(call print_info_section,Running YouTube unit tests)
	$(Q)$(NPM) exec vitest -- run tests/youtube-adapter.test.js

.PHONY: test-watch
test-watch: ## Run tests in watch mode
	$(call print_info_section,Running tests in watch mode)
	$(Q)$(NPM) run test:watch

.PHONY: test-coverage
test-coverage: ## Run tests with coverage
	$(call print_info_section,Running tests with coverage)
	$(Q)$(NPM) run test:coverage

# --- E2E tests (Playwright) ---

.PHONY: test-e2e
test-e2e: ## Run all Playwright E2E tests
	$(call print_info_section,Running E2E tests)
	$(Q)$(NPM) run test:e2e

.PHONY: test-e2e-substack
test-e2e-substack: ## Run Substack E2E tests
	$(call print_info_section,Running Substack E2E tests)
	$(Q)$(NPM) exec playwright -- test --grep "substack"

.PHONY: test-e2e-twitter
test-e2e-twitter: ## Run Twitter/X E2E tests
	$(call print_info_section,Running Twitter/X E2E tests)
	$(Q)$(NPM) exec playwright -- test --grep "x.com"

.PHONY: test-e2e-soundcloud
test-e2e-soundcloud: ## Run SoundCloud E2E tests
	$(call print_info_section,Running SoundCloud E2E tests)
	$(Q)$(NPM) exec playwright -- test --grep "soundcloud"

.PHONY: test-e2e-youtube
test-e2e-youtube: ## Run YouTube E2E tests
	$(call print_info_section,Running YouTube E2E tests)
	$(Q)$(NPM) exec playwright -- test --grep "youtube"
