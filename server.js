const express = require("express");
const serveIndex = require("serve-index");
const multer = require("multer");
const path = require("path");
const os = require("os");
const fs = require("fs");
const archiver = require("archiver"); // ZIP creator

const app = express();

// *********************************************************
//  CONFIGURE SHARED FOLDERS (CUSTOMIZE THESE IF YOU WANT)
// *********************************************************
const sharedFolders = {
  Insurance: path.join(__dirname, "InsuranceSparkOutput"),
  Projects: path.join(__dirname, "MyProjects"),
  Uploads: path.join(__dirname, "SharedUploads"),
};

// Create folders if missing
Object.values(sharedFolders).forEach((folder) => {
  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder, { recursive: true });
  }
});

// *********************************************************
// FILE UPLOAD HANDLER
// *********************************************************
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const folderName = req.params.folder;
    const folderPath = sharedFolders[folderName];
    cb(null, folderPath);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

// Upload route
app.post("/upload/:folder", upload.single("file"), (req, res) => {
  res.send(`
        <h2>✅ Upload Successful!</h2>
        <a href="/${req.params.folder}">⬅ Back to Folder</a>
    `);
});

// *********************************************************
// FOLDER ZIP DOWNLOAD ROUTE
// *********************************************************
app.get("/download-folder/:folder", (req, res) => {
  const folderName = req.params.folder;
  const folderPath = sharedFolders[folderName];

  if (!folderPath) return res.send("❌ Invalid folder name");

  res.setHeader(
    "Content-Disposition",
    `attachment; filename=${folderName}.zip`
  );

  const archive = archiver("zip");
  archive.pipe(res);
  archive.directory(folderPath, false);
  archive.finalize();
});

// *********************************************************
// CUSTOM FOLDER VIEW WITH UPLOAD BUTTON + FILE LIST
// *********************************************************
for (let [folderName, folderPath] of Object.entries(sharedFolders)) {
  app.get(`/${folderName}`, (req, res) => {
    const files = fs.readdirSync(folderPath);

    let html = `
      <h1>📂 ${folderName}</h1>
      <a href="/">⬅ Home</a>
      <hr>

      <h2>⬆ Upload a File</h2>
      <form action="/upload/${folderName}" method="post" enctype="multipart/form-data">
        <input type="file" name="file" required />
        <button type="submit">Upload</button>
      </form>

      <hr>
      <h2>📁 Download Entire Folder</h2>
      <a href="/download-folder/${folderName}">
        <button>⬇ Download ZIP</button>
      </a>

      <hr>
      <h2>📄 Files</h2>
      <ul>
    `;

    files.forEach((file) => {
      html += `
        <li>
          <a href="/${folderName}/${file}" download>${file}</a>
        </li>
      `;
    });

    html += "</ul>";

    // Static file serving
    app.use(`/${folderName}`, express.static(folderPath));

    res.send(html);
  });
}

// *********************************************************
// HOME PAGE
// *********************************************************
app.get("/", (req, res) => {
  let html = `<h1>🚀 BeamBox — Instant LAN File Sharing</h1><ul>`;
  for (let folder of Object.keys(sharedFolders)) {
    html += `<li><a href="/${folder}">${folder}</a></li>`;
  }
  html += "</ul>";
  res.send(html);
});

// *********************************************************
// DETECT LOCAL IP
// *********************************************************
const networkInterfaces = os.networkInterfaces();
let ipAddress = "localhost";
for (let iface of Object.values(networkInterfaces)) {
  for (let detail of iface) {
    if (detail.family === "IPv4" && !detail.internal) {
      ipAddress = detail.address;
    }
  }
}

// *********************************************************
// START SERVER
// *********************************************************
const PORT = 3000;
app.listen(PORT, () => {
  console.log("\n🚀 BeamBox Started!");
  console.log(`🌍 Your browser: http://localhost:${PORT}`);
  console.log(`👫 Share with friend: http://${ipAddress}:${PORT}`);
  console.log("📂 Shared Folders:");
  Object.keys(sharedFolders).forEach((f) => console.log(" - " + f));
});
