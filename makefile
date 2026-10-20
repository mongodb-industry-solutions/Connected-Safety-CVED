DB ?= local
SCENARIO ?= all
SCENARIOS := $(basename $(notdir $(wildcard infra/vissr/vehicle/trips/*.json)))

COMPOSE_FILES := -f docker-compose.yml
ifeq ($(DB),local)
COMPOSE_FILES += -f docker-compose.local.yml
endif
COMPOSE := docker compose $(COMPOSE_FILES)
ALL_COMPOSE := docker compose -f docker-compose.yml -f docker-compose.local.yml

.PHONY: help start crash reset status logs stop clean

help:
	@echo "make start [DB=atlas]         build and start the demo, the first trip ends in a crash (DB=local: MongoDB in a container)"
	@echo "make crash [SCENARIO=<name>]  replay a crash: all (default), ammDemoTrip, $(SCENARIOS)"
	@echo "make reset                    delete the alerts and crash documents"
	@echo "make status | logs | stop | clean"

start:
ifeq ($(DB),atlas)
	@grep -q '^MONGODB_URI=..*' .env 2>/dev/null || (echo "Set MONGODB_URI in .env for DB=atlas" && exit 1)
endif
	$(COMPOSE) up -d --build
	@echo "RTIC 911: http://localhost:5050, the crash alert arrives within a few seconds"

# every crash gets a new incident id, so it is a new alert in RTIC 911
crash:
	@for trip in $(if $(filter all,$(SCENARIO)),$(SCENARIOS),$(SCENARIO)); do \
		echo "Crash scenario: $$trip"; \
		TRIP=$$trip $(COMPOSE) up -d --no-deps --force-recreate vissr-vehicle crash-agent > /dev/null 2>&1 || exit 1; \
		docker compose wait crash-agent > /dev/null || exit 1; \
	done
	@echo "Done, watch http://localhost:5050"

reset:
	$(COMPOSE) exec rtic911 node scripts/reset.mjs

status:
	$(COMPOSE) ps -a

logs:
	$(COMPOSE) logs -f

stop:
	$(ALL_COMPOSE) down

clean:
	$(ALL_COMPOSE) down -v --rmi local
