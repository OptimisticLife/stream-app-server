const fs = require("fs");
const path = require("path");
const { bodyParser } = require("../utils");
const movies = require("../storage/movies.json");

let movieName = "",
  thumbnailName = "",
  movieSize = 0,
  thumbnailSize = 0,
  movieType = "",
  thumbnailType = "";

let moviePath = "";
let thumbnailPath = "";

function removingFailedChunk(path) {
  fs.rm(path, (err) => {
    if (err) {
      console.error("Error deleting file:", err);
    } else {
      console.log("File deleted successfully", path);
    }
  });
}

function checkFileSizeUploaded(path, expectedSize) {
  return new Promise((resolve, reject) => {
    fs.stat(path, (err, stats) => {
      if (err) {
        console.error("Error getting file stats:", err);
        reject(err);
      }
      console.log("Uploaded  size:", stats.size);
      console.log("Expected  size:", expectedSize);
      if (stats.size === expectedSize) {
        resolve(true);
      } else {
        resolve(false);
      }
    });
  });
}

function uploadChunk(req, res, path) {
  let chunkSize = 0;
  const writeStream = fs.createWriteStream(path, { flags: "a" });

  req.on("data", (chunk) => {
    chunkSize += chunk.length;
  });

  req.on("error", (err) => {
    console.error("Request error:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ message: "Request error" }));
  });

  writeStream.on("error", (err) => {
    console.error("Error writing to file:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ message: "Write error" }));
  });

  writeStream.on("finish", () => {
    console.log("Chunk written successfully");
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ message: "Chunk uploaded" }));
  });

  // Pipe request body into the file
  req.pipe(writeStream);

  req.on("end", () => {
    console.log("Request ended");
    console.log("Total chunk size:", chunkSize);
    writeStream.end(); // Important!
  });
}

function movieUpload(req, res) {
  bodyParser(req).then((data) => {
    data = JSON.parse(data);
    movieName = data.movieName;
    if (movieName.includes(" ")) {
      movieName = movieName.replace(/ /g, "_");
    }
    movieSize = data.movieSize;
    movieType = data.movieType.split("/")[1];
    thumbnailName = data.thumbnailName;
    if (thumbnailName.includes(" ")) {
      thumbnailName = thumbnailName.replace(/ /g, "_");
    }

    thumbnailSize = data.thumbnailSize;
    thumbnailType = data.thumbnailType.split("/")[1];

    moviePath = path.join(
      __dirname,
      "../storage/movievideo",
      `${movieName}.${movieType}`
    );

    thumbnailPath = path.join(
      __dirname,
      "../storage/movieImg",
      `${thumbnailName}.${thumbnailType}`
    );

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ message: "Movie metaData received" }));
  });
}

function movieChunk(req, res) {
  uploadChunk(req, res, moviePath);
}

function thumbnailChunk(req, res) {
  uploadChunk(req, res, thumbnailPath);
}

async function movieUploadConfirmation(req, res) {
  let isMovieUploaded = await checkFileSizeUploaded(
    moviePath,
    parseInt(movieSize)
  );

  let isThumbnailUploaded = await checkFileSizeUploaded(
    thumbnailPath,
    parseInt(thumbnailSize)
  );

  if (!isMovieUploaded || !isThumbnailUploaded) {
    removingFailedChunk(moviePath);
    removingFailedChunk(thumbnailPath);
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ message: "File upload failed" }));
  } else {
    // Here you can add the logic to save the movie and thumbnail information to your database
    // For example:
    const newMovie = {
      title: movieName,
      img: `http://localhost:4647/${thumbnailName}.${thumbnailType}`,
      videoSrc: `http://localhost:4647/${movieName}.${movieType}`,
    };
    movies.push(newMovie);
    fs.writeFileSync(
      path.join(__dirname, "../storage/movies.json"),
      JSON.stringify(movies)
    );
    console.log("New movie added to movies.json");
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ message: "New Movie uploaded successfully" }));
  }
}
module.exports = {
  movieChunk,
  thumbnailChunk,
  movieUpload,
  movieUploadConfirmation,
};

// const Busboy = require("busboy");

// function busboyFormHandler(req, res) {
//   const busboy = new Busboy({ headers: req.headers });
//   let fileName, chunkIndex, totalChunks;
//   let tempPath = "";

//   busboy.on("field", (fieldname, value) => {
//     if (fieldname === "fileName") fileName = value;
//     if (fieldname === "chunkIndex") chunkIndex = value;
//     if (fieldname === "totalChunks") totalChunks = value;
//   });
//   busboy.on("file", (file) => {
//     const filePath = `./uploads/${fileName}`;
//     tempPath = `${filePath}.part${chunkIndex}`;

//     const writeStream = fs.createWriteStream(tempPath);
//     file.pipe(writeStream);

//     writeStream.on("finish", () => {
//       console.log(`Chunk ${chunkIndex} of ${fileName} uploaded successfully.`);
//       if (parseInt(chunkIndex) === parseInt(totalChunks)) {
//         // All chunks uploaded, merge them
//         mergeChunks(fileName, totalChunks);
//       }
//     });
//   });
//   busboy.on("finish", () => {
//     res.writeHead(200, { Connection: "close" });
//     res.end("Chunk uploaded successfully");
//   });
// }
