# Pic Stream Photo Share

A simple app that lets users share original photos and videos to everyone else in the group to view and download.

## Getting Started

Run `docker compose up --build` to get started with the full application.

## Requirements

- [ ] User must be able to create a new album.
- [ ] User must be able to delete the album using the password.
- [ ] The system will generate a short album key to share with others. Anyone with the album key will be able to view the album and download the contents.
- [ ] User must be able to upload multiple files at once.
- [ ] The system will generate a thumbnail for each file.
- [ ] The system will delete the thumbnail whenever the original file is deleted.
- [ ] The user must be able to download one file at a time.
- [ ] The user must be able to download the whole album as a zip.

## The Stack

- React frontend library
- Express.js backend framework
- MySQL database
- sequelize or typeorm ORM
- Node.js

## API

| Method | URL                        | Description                                                                                           |
| ------ | -------------------------- | ----------------------------------------------------------------------------------------------------- |
| POST   | /album                     | creates a new album and returns the albumKey                                                          |
| GET    | /albums/:albumKey          | returns a list of thumbnail and original pre-signed URLs the UI can then call to retrieve the images. |
| DELETE | /albums/:albumKey          | deletes all the photos and videos in the album including the thumbnails                               |
| POST   | /albums/:albumKey          | upload one or more photos and videos                                                                  |
| POST   | /albums/:albumKey/download | returns a zip of the whole album to download                                                          |

## Database

A table, albums, to store the album keys

```sql
CREATE TABLE albums (
  id VARCHAR(10) UNIQUE PRIMARY KEY, # alphanumeric, case sensitive
  name VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
)
```

## AWS

For each album, create a S3 bucket and within that bucket, create a thumbnails folder.
Whenever an object is added, create a thumbnail. Whenever an object is removed, delete the thumbnail.

## Frontend

- A page to enter the album key to navigate to the album gallery and that page has a button to create a new album
- A page for the album gallery that lists all the photos and videos, link to download whole album and each photo/video will have it's own download link, a button to delete the album.
