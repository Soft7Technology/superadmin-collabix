# ---------- CONFIG ----------

# Main dependencies
PACKAGES = axios lucide-react next react react-dom

# Dev dependencies
DEV_PACKAGES = @types/node @types/react @types/react-dom eslint eslint-config-next typescript

.PHONY: install dev build start lint clean setup

# Install all dependencies
install:
	npm install $(PACKAGES) --save && npm install $(DEV_PACKAGES) --save-dev
	@echo "All superadmin packages installed!"

# Start the Next.js dev server
dev:
	npm run dev

# Build the project for production
build:
	npm run build

# Run production server
start:
	npm start

# Lint admin code
lint:
	npm run lint

# Clean compile cache
clean:
	@echo "Cleaning up Next.js build cache..."
	-rd /s /q .next

# One-command full setup
setup:
	@echo "🔄 Running superadmin setup..."
	make install
	make build
	@echo "🚀 Starting superadmin dev server..."
	make dev
