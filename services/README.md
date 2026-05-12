# Microservices Layer (Example)

This folder contains service modules that represent microservice boundaries in a monorepo style. In a real microservices architecture, each service would be a separate app/repo with its own API/server/database.

## Services

- userService.js
- tradeService.js
- priceService.js
- notificationService.js
- walletService.js

## How to use

Import and use these services in your controllers/routes. For a true microservices setup, split each into its own Node.js app and use HTTP/gRPC/message queues for communication.
