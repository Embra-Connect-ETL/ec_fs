## Quickstart

### Prerequisites
- Install required dependencies by running the following command:

```sh
python3 -m venv venv
source venv/bin/activate # If running on Linux
pip install -r requirements.txt
```

- Set the required `ENVIRONMENT VARIABLES`:
  
```env
#------------------------------------------------------------------------------------
# [MinIO]
#
# MinIO manages Embra Connect's [File System], Data Warehouses and Delta Lake
# The following credentials will be used by the spark service to read & write from MinIO.
#------------------------------------------------------------------------------------

#----------------------------------------------
# File System Access
#----------------------------------------------

# If running via Docker
# EC_FS_ENDPOINT=minio:9000
EC_FS_ENDPOINT=localhost:9000
EC_FS_BUCKET=ec-fs
MINIO_ROOT_USER=ec_root_user
MINIO_ROOT_PASSWORD=cQ8BE0R+HHz/6pmDISlI7Dk=

#------------------------------------------------------------------------------------------
# The following credentials can be created via the MinIO console [optional]
#------------------------------------------------------------------------------------------
MINIO_ACCESS_KEY=
MINIO_SECRET_KEY=
```


- Using MinIO as the Object Store backend:
```sh
docker compose up minio
```

- Run the API:

```sh
python3 ec_fs_api  
```

- Run the UI:

```sh
python3 ec_fs_ui  
```
