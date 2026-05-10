.PHONY: ai-policy new-task

ai-policy:
	python3 scripts/check_ai_change_policy.py

new-task:
	@if [ -z "$(TASK_ID)" ] || [ -z "$(NAME)" ]; then \
		echo "Usage: make new-task TASK_ID=TASK-0001 NAME=short-name"; \
		exit 1; \
	fi
	./scripts/ai_new_task.sh $(TASK_ID) $(NAME)
