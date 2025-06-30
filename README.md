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
EC_FS_ENDPOINT=minio:9000
EC_FS_BUCKET=your-bucket
MINIO_ROOT_USER=your_user_name
MINIO_ROOT_PASSWORD=your_password

#------------------------------------------------------------------------------------------
# The following credentials can be created via the MinIO console [optional]
#------------------------------------------------------------------------------------------
MINIO_ACCESS_KEY=
MINIO_SECRET_KEY=
```

- Run the API:

```sh
python3 ec_fs_api  
```

- Run the UI:

```sh
python3 ec_fs_ui  
```
