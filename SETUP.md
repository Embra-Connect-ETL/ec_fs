# Setup and Usage Guide

This guide explains how to set up and use **ec_fs** with Docker Compose. The setup includes several components: **Master**, **Volume**, **Filer**, **S3**, **WebDAV**, and **Prometheus**.

## Prerequisites

-   Docker installed
-   Docker Compose installed
    
## 1. **Setup and Run SeaweedFS with Docker Compose**

### Step 1: The `docker-compose.yml` file

Here is a reference for the `docker-compose.yml` file to deploy the necessary services.

```yaml
version: '3.9'

services:
  master:
    image: chrislusf/seaweedfs
    ports:
      - 9333:9333
      - 19333:19333
      - 9324:9324
    command: "master -ip=master -ip.bind=0.0.0.0 -metricsPort=9324"

  volume:
    image: chrislusf/seaweedfs
    ports:
      - 8080:8080
      - 18080:18080
      - 9325:9325
    command: 'volume -mserver="master:9333" -ip.bind=0.0.0.0 -port=8080  -metricsPort=9325'
    depends_on:
      - master

  filer:
    image: chrislusf/seaweedfs
    ports:
      - 8888:8888
      - 18888:18888
      - 9326:9326
    command: 'filer -master="master:9333" -ip.bind=0.0.0.0 -metricsPort=9326'
    tty: true
    stdin_open: true
    depends_on:
      - master
      - volume

  s3:
    image: chrislusf/seaweedfs
    ports:
      - 8333:8333
      - 9327:9327
    command: 's3 -filer="filer:8888" -ip.bind=0.0.0.0 -metricsPort=9327'
    depends_on:
      - master
      - volume
      - filer

  webdav:
    image: chrislusf/seaweedfs
    ports:
      - 7333:7333
    command: 'webdav -filer="filer:8888"'
    depends_on:
      - master
      - volume
      - filer

  prometheus:
    image: prom/prometheus:v2.21.0
    ports:
      - 9000:9090
    volumes:
      - ./prometheus:/etc/prometheus
    command: --web.enable-lifecycle  --config.file=/etc/prometheus/prometheus.yml
    depends_on:
      - s3
```

### Step 2: Start the Containers

Run the following command to start all the services in your `docker-compose.yml` file:

```sh
docker compose -f seaweedfs-compose.yml -p seaweedfs up
```

This command will download the necessary images and start the containers for **SeaweedFS**, **Prometheus**, **S3**, **WebDAV**, and **Master/Volume/Filer** services.

----------

## 2. **Services Overview**

### Master

-   **Ports**: `9333`, `19333`, `9324`
    
-   **Role**: Manages the metadata of the SeaweedFS cluster and controls access to the volumes.
    

### Volume

-   **Ports**: `8080`, `18080`, `9325`
    
-   **Role**: Stores files. This service depends on the master and can serve data.
    

### Filer

-   **Ports**: `8888`, `18888`, `9326`
    
-   **Role**: Provides **file system** access to SeaweedFS, allowing operations like uploading, downloading, and deleting files.
    

### S3

-   **Ports**: `8333`, `9327`
    
-   **Role**: Provides **S3-compatible** API access to SeaweedFS, allowing you to interact with SeaweedFS as if it were an S3 service.
    

### WebDAV

-   **Ports**: `7333`
    
-   **Role**: Provides **WebDAV** access to SeaweedFS, allowing file manipulation through a WebDAV interface.
    

### Prometheus

-   **Ports**: `9000`
    
-   **Role**: Monitors the SeaweedFS cluster's metrics. Useful for performance and health monitoring.
    

----------

## 3. **Accessing the Web UI**

Once the services are up and running, you can access the **SeaweedFS Web UI** for file management.

-   **Web UI for Filer**:  
    Open your browser and navigate to:
    
    ```
    http://localhost:8888
    ```
    

----------

## 4. **Basic File Operations**

### Upload Files

1.  Go to the **Web UI** at `http://localhost:8888`.
    
2.  Use the **File Upload** section to upload files to your SeaweedFS instance.
    

### Delete Files

1.  Navigate to the uploaded files in the **Web UI**.
    
2.  Use the **Delete** button to remove files.
    

----------

## 5. **Accessing Files via WebDAV**

If you want to use **WebDAV** to interact with SeaweedFS, you can access it at port `7333`:

-   **WebDAV URL**:
    
    ```
    http://localhost:7333    
    ```
    

You can use any **WebDAV client** (e.g., **Cyberduck**, **FileZilla**, etc.) to upload, download, and delete files.

----------

## 6. **Accessing Files via S3 API**

To interact with SeaweedFS using **S3** commands, you can access it via port `8333`.

1.  Install `aws-cli` or any **S3-compatible client**.
    
2.  Set the endpoint to `http://localhost:8333` and use the S3 commands as usual:
    
    ```sh
    aws --endpoint-url=http://localhost:8333 s3 ls
    aws --endpoint-url=http://localhost:8333 s3 cp myfile.txt s3://mybucket/
    ```
    

----------

## 7. **Prometheus Metrics**

To monitor the health and performance of your SeaweedFS instance, you can access the **Prometheus Dashboard** at `http://localhost:9000`.

Prometheus will collect and display metrics about the SeaweedFS components (Master, Volume, Filer, etc.).

----------

## 8. **Shutting Down**

To stop all services and containers:

```sh
docker compose -f seaweedfs-compose.yml -p seaweedfs down
```