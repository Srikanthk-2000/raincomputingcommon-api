const mongoose = require("mongoose");
const Readable = require("stream").Readable;
const GridFSUploader = async ({ data, fileName, contentType = "content" }) => {
  try {
    const Stream = new Readable();

    let base64 = data.replace(/_/g, "/");
    base64 = base64.replace(/-/g, "+");
    const buffer = Buffer.from(base64, "base64");

    Stream.push(buffer);
    Stream.push(null);

    const db = mongoose.connections[0].db;
    //   console.log("db ", db);
    const gfs = new mongoose.mongo.GridFSBucket(db, {
      bucketName: "attachments",
    });
    const uploadRes = Stream.pipe(
      gfs.openUploadStream(fileName, {
        contentType,
      })
    );
    return uploadRes?.id;
  } catch (err) {
    console.log(err);
  }
};

module.exports = GridFSUploader;
