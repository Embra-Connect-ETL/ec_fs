# Setup Guide

This guide will walk you through setting up **ec_fs** as a file storage solution using Docker Compose. MinIO is a high-performance, S3-compatible object storage server that can be used for storing large amounts of data.

## Prerequisites

Before you begin, ensure you have the following installed:

-   **Docker**: Install Docker from the official website: [Docker Installation](https://docs.docker.com/get-docker/)
    
-   **Docker Compose**: Install Docker Compose from the official website: [Docker Compose Installation](https://docs.docker.com/compose/install/)
    

## Step 1: Create Directory for MinIO Data

Create a directory on your host machine to store the MinIO data. This ensures that your data persists even if the container is stopped or removed.

```bash
mkdir -p ${HOME}/minio/data

```

## Step 2: Create Docker Compose Configuration

Create a `docker-compose.yml` file in your desired project directory and add the following configuration:

```yaml
version: '3.7'

services:
  minio:
    image: quay.io/minio/minio:latest
    container_name: minio1
    environment:
      - MINIO_ROOT_USER=ROOTUSER
      - MINIO_ROOT_PASSWORD=CHANGEME123
    ports:
      - "9000:9000"      # MinIO API
      - "9001:9001"      # MinIO Console
    volumes:
      - ${HOME}/minio/data:/data
    user: "${UID}:${GID}"  # Runs as the current user
    command: server /data --console-address ":9001"
    restart: unless-stopped
```

### Configuration Details:

-   **image**: `quay.io/minio/minio` is the official MinIO Docker image.
    
-   **environment**:
    
    -   `MINIO_ROOT_USER`: The admin username for MinIO.
        
    -   `MINIO_ROOT_PASSWORD`: The admin password for MinIO.
        
-   **ports**:
    
    -   Port `9000` is used for the MinIO API.
        
    -   Port `9001` is used for the MinIO web console.
        
-   **volumes**: Mounts the host directory `${HOME}/minio/data` to `/data` in the container, ensuring that data persists.
    
-   **user**: Ensures the container runs with the same user as the host system to prevent file permission issues.
    
-   **command**: Starts the MinIO server with the data directory and web console.
    
-   **restart**: Ensures that the container automatically restarts unless explicitly stopped.
    

## Step 3: Start MinIO with Docker Compose

From the directory where you saved the `docker-compose.yml` file, run the following command to start MinIO:

```bash
docker-compose up
```

This command will:

-   Pull the MinIO Docker image if not already available.
    
-   Start the MinIO container, exposing ports `9000` (API) and `9001` (web console).
    
-   Mount the host directory `${HOME}/minio/data` to `/data` in the container for persistent storage.
    

## Step 4: Access MinIO Web Console

Once the container is running, open your web browser and go to the following address to access the MinIO web console:

```
http://localhost:9001
```

### Log in with the following credentials:

-   **Username**: `ROOTUSER`
    
-   **Password**: `CHANGEME123`
    

Once logged in, you can manage buckets, upload files, and configure other settings for your object storage.

## Step 5: Using the MinIO API

The MinIO server's API will be available at `http://localhost:9000`. You can use the S3-compatible API to interact programmatically with MinIO.

For example, you can use AWS CLI or any S3-compatible client to interact with the MinIO API using the same credentials (`ROOTUSER` / `CHANGEME123`).

### Example AWS CLI Command:

To configure AWS CLI to use MinIO:

```bash
aws configure
```

Set the following values:

-   **AWS Access Key ID**: `ROOTUSER`
    
-   **AWS Secret Access Key**: `CHANGEME123`
    
-   **Default region name**: `us-east-1` (or any region you prefer)
    
-   **Default output format**: `json`
    

You can now use AWS CLI to interact with MinIO, for example:

```bash
aws s3 mb s3://my-bucket --endpoint-url http://localhost:9000
```

## Step 6: Stopping the MinIO Container

To stop the MinIO container, run:

```bash
docker-compose down
```

This will stop and remove the container, but your data will persist in the `minio/data` directory on your host.

----------

### Additional Notes:

-   **Data Persistence**: The data is stored in the `${HOME}/minio/data` directory on your host machine, which ensures that your data remains intact between container restarts.
    
-   **Security**: Change the `MINIO_ROOT_USER` and `MINIO_ROOT_PASSWORD` values to something more secure for production environments.