require("dotenv").config(); // Load .env
const fs = require("fs");

const {
  S3Client,
  HeadObjectCommand,
  GetObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  PutObjectCommand,
} = require("@aws-sdk/client-s3");

const uploads = {};

// Configure AWS S3 Client (v3)
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// STREAM VIDEO FILE FROM S3
async function streamFileFromS3(req, res, isVideo = false) {
  console.log("*** video id", req.url);

  const fileName = req.url.split("/")[1];
  const range = req.headers?.range;
  const key = isVideo ? `videos/${fileName}` : `thumbnails/${fileName}`;
  let responseSent = false;

  try {
    const head = await s3.send(
      new HeadObjectCommand({
        Bucket: process.env.AWS_BUCKET,
        Key: key,
      })
    );

    let start = 0;
    let end = head.ContentLength - 1;

    if (range) {
      const [rangeStart, rangeEnd] = range.replace(/bytes=/, "").split("-");
      start = parseInt(rangeStart, 10);
      end = rangeEnd ? parseInt(rangeEnd, 10) : end;

      if (
        start >= head.ContentLength ||
        end >= head.ContentLength ||
        start > end
      ) {
        if (!responseSent) {
          res.writeHead(416, {
            "Content-Range": `bytes */${head.ContentLength}`,
          });
          res.end();
        }
        return;
      }
    }

    const command = new GetObjectCommand({
      Bucket: process.env.AWS_BUCKET,
      Key: key,
      Range: `bytes=${start}-${end}`,
    });

    const { Body } = await s3.send(command);

    res.writeHead(206, {
      "Content-Type": "video/mp4",
      "Content-Length": end - start + 1,
      "Accept-Ranges": "bytes",
      "Content-Range": `bytes ${start}-${end}/${head.ContentLength}`,
    });

    Body.pipe(res);
  } catch (err) {
    console.error("Stream error:", err);
    if (!responseSent) {
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end("Failed to stream video.");
    }
  }
}

// UPLOAD FILE TO S3 (CHUNKED)
async function uploadFileToS3(req, res, isVideo = false) {
  const fileId = req.headers["x-file-id"];
  const isLast = req.headers["x-is-last"] === "true";

  try {
    const movieName = fileId.split("-")[0];
    const movieId = fileId.split("-")[1];
    let isNewMovie = true;

    const movies = await retrieveJsonFilesFromS3("movies");

    let movieDetail = movies.find((m) => {
      if (m.id === movieId) {
        isNewMovie = false;
        return true;
      }
      return false;
    });

    if (!movieDetail) {
      movieDetail = {
        id: movieId,
        name: movieName,
        thumbnailMetaData: null,
        videoMetaData: null,
      };
    }

    const keyName = isVideo
      ? `videos/${movieId}.mp4`
      : `thumbnails/${movieId}.jpeg`;

    if (!uploads[movieName]) {
      const { UploadId } = await s3.send(
        new CreateMultipartUploadCommand({
          Bucket: process.env.AWS_BUCKET,
          Key: keyName,
        })
      );
      uploads[movieName] = { UploadId, Parts: [], partNumber: 1 };
    }

    const uploadSession = uploads[movieName];

    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));

    req.on("end", async () => {
      const buffer = Buffer.concat(chunks);

      const { ETag } = await s3.send(
        new UploadPartCommand({
          Bucket: process.env.AWS_BUCKET,
          Key: keyName,
          PartNumber: uploadSession.partNumber,
          UploadId: uploadSession.UploadId,
          Body: buffer,
          ContentLength: buffer.length,
        })
      );

      uploadSession.Parts.push({
        PartNumber: uploadSession.partNumber,
        ETag,
      });
      uploadSession.partNumber++;

      if (isLast) {
        const completed = await s3.send(
          new CompleteMultipartUploadCommand({
            Bucket: process.env.AWS_BUCKET,
            Key: keyName,
            UploadId: uploadSession.UploadId,
            MultipartUpload: { Parts: uploadSession.Parts },
          })
        );

        if (isVideo) {
          movieDetail.videoMetaData = completed;
        } else {
          movieDetail.thumbnailMetaData = completed;
        }

        if (isNewMovie) {
          movies.push(movieDetail);
        } else {
          const index = movies.findIndex((m) => m.id === movieId);
          if (index !== -1) {
            movies[index] = movieDetail;
          }
        }

        fs.writeFileSync(
          "./storage/movies.json",
          JSON.stringify(movies, null, 2)
        );
        await uploadingJsonFilestoS3("movies", movies);

        delete uploads[movieName];
        res.writeHead(200, { "content-type": "text/plain" });
        return res.end("Upload complete");
      }

      res.writeHead(200, { "content-type": "text/plain" });
      res.end("Chunk complete");
    });
  } catch (err) {
    console.error("Upload error:", err);
    res.writeHead(500, { "content-type": "application/json" });
    res.end(JSON.stringify({ message: "Upload failed", error: err }));
  }
}

//  UPLOAD JSON FILE TO S3
async function uploadingJsonFilestoS3(fileName, data) {
  const params = {
    Bucket: process.env.AWS_BUCKET,
    Key: `files/${fileName}.json`,
    Body: JSON.stringify(data, null, 2),
    ContentType: "application/json",
  };

  try {
    await s3.send(new PutObjectCommand(params));
    console.log(`${fileName}.json uploaded successfully`);
  } catch (err) {
    console.error(`Failed to upload ${fileName}.json`, err);
  }
}

async function retrieveJsonFilesFromS3(fileName) {
  // Helper to convert stream to string
  async function streamToString(stream) {
    return new Promise((resolve, reject) => {
      const chunks = [];
      stream.on("data", (chunk) => chunks.push(chunk));
      stream.on("error", reject);
      stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
    });
  }

  const command = new GetObjectCommand({
    Bucket: process.env.AWS_BUCKET,
    Key: `files/${fileName}.json`, // e.g. "files/movies.json"
  });

  try {
    const response = await s3.send(command);
    const bodyString = await streamToString(response.Body);
    const json = JSON.parse(bodyString);
    return json;
  } catch (error) {
    console.error("Failed to get JSON from S3:", error);
    throw error;
  }
}

module.exports = {
  streamFileFromS3,
  uploadFileToS3,
  uploadingJsonFilestoS3,
  retrieveJsonFilesFromS3,
};
