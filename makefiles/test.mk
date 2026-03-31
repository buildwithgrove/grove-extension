####################
###   Testing    ###
####################

# --- Unit tests (Vitest) ---

.PHONY: test_unit
test_unit: ## Run all Vitest unit tests
	$(call print_info_section,Running unit tests)
	$(Q)$(NPM) run test

.PHONY: test_unit_substack
test_unit_substack: ## Run Substack adapter unit tests
	$(call print_info_section,Running Substack unit tests)
	$(Q)npx vitest run tests/substack-adapter.test.js

.PHONY: test_unit_twitter
test_unit_twitter: ## Run Twitter adapter unit tests
	$(call print_info_section,Running Twitter unit tests)
	$(Q)npx vitest run tests/twitter-adapter.test.js tests/integration/twitter-flow.test.js

.PHONY: test_unit_soundcloud
test_unit_soundcloud: ## Run SoundCloud adapter unit tests
	$(call print_info_section,Running SoundCloud unit tests)
	$(Q)npx vitest run tests/soundcloud-adapter.test.js

.PHONY: test_unit_youtube
test_unit_youtube: ## Run YouTube adapter unit tests
	$(call print_info_section,Running YouTube unit tests)
	$(Q)npx vitest run tests/youtube-adapter.test.js

.PHONY: test_unit_linkedin
test_unit_linkedin: ## Run LinkedIn adapter unit tests
	$(call print_info_section,Running LinkedIn unit tests)
	$(Q)npx vitest run tests/linkedin-adapter.test.js

.PHONY: test_watch
test_watch: ## Run tests in watch mode
	$(call print_info_section,Running tests in watch mode)
	$(Q)$(NPM) run test:watch

.PHONY: test_coverage
test_coverage: ## Run tests with coverage
	$(call print_info_section,Running tests with coverage)
	$(Q)$(NPM) run test:coverage

# --- E2E tests (Playwright) ---

.PHONY: test_e2e
test_e2e: ## Run all Playwright E2E tests
	$(call print_info_section,Running E2E tests)
	$(Q)$(NPM) run test:e2e

.PHONY: test_e2e_substack
test_e2e_substack: ## Run Substack E2E tests
	$(call print_info_section,Running Substack E2E tests)
	$(Q)npx playwright test --grep "substack"

.PHONY: test_e2e_twitter
test_e2e_twitter: ## Run Twitter/X E2E tests
	$(call print_info_section,Running Twitter/X E2E tests)
	$(Q)npx playwright test --grep "x.com"

.PHONY: test_e2e_soundcloud
test_e2e_soundcloud: ## Run SoundCloud E2E tests
	$(call print_info_section,Running SoundCloud E2E tests)
	$(Q)npx playwright test --grep "soundcloud"

.PHONY: test_e2e_youtube
test_e2e_youtube: ## Run YouTube E2E tests
	$(call print_info_section,Running YouTube E2E tests)
	$(Q)npx playwright test --grep "youtube"

.PHONY: test_e2e_linkedin
test_e2e_linkedin: ## Run LinkedIn E2E tests
	$(call print_info_section,Running LinkedIn E2E tests)
	$(Q)npx playwright test --grep "linkedin"
