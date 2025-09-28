.PHONY: setup contracts test
setup:
	pip install -r requirements.txt || true
contracts:
	pytest -q tests/contract
test:
	pytest -q
