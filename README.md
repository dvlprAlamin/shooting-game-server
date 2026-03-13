# Shooting Game Server

This is the backend server for the shooting game.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)

## Running with Docker

1.  **Build and run the container:**

    ```bash
    docker-compose up --build
    ```

    This will start the server on port 3000.

2.  **Stop the container:**

    Press `Ctrl+C` in the terminal where it's running, or run:

    ```bash
    docker-compose down
    ```

3.  **Run in detached mode (background):**

    ```bash
    docker-compose up -d
    ```

4.  **View logs:**

    ```bash
    docker-compose logs -f
    ```

## Development

To run locally without Docker:

1.  Install dependencies:
    ```bash
    yarn install
    ```

2.  Start the server:
    ```bash
    yarn start
    ```
