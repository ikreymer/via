.PHONY: docker
docker:
	docker build -t hypothesis/via:latest .

.PHONY: clean
clean:
	find . -type f -name "*.py[co]" -delete
	find . -type d -name "__pycache__" -delete
