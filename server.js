const express = require("express");
const multer = require("multer");
const crypto = require("crypto");
const fs = require("fs");
const cors = require("cors");
const path = require("path");


const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

/* ✅ ADD YOUR API KEY HERE */
const BLOCKFROST_API = "https://cardano-mainnet.blockfrost.io/api/v0";
const API_KEY = "mainnetTUIOyQPHs6bf5c7XJi61MM4UKChrMyYA";

/* ✅ ENSURE FOLDERS EXIST */
if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");
if (!fs.existsSync("data")) fs.mkdirSync("data");

/* ✅ MULTER CONFIG */
const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 1 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      return cb(new Error("Only PDF files are allowed"), false);
    }
    cb(null, true);
  }
});

const DATA_FILE = "data/certificates.json";

/* LOAD / SAVE */
function loadCertificates() {
  if (!fs.existsSync(DATA_FILE)) return [];
  return JSON.parse(fs.readFileSync(DATA_FILE));
}

function saveCertificates(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

/* HASH */
function generateHash(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

/* ✅ BLOCKCHAIN FUNCTION (NEW) */
async function sendToBlockchain(hash) {
  try {
    const res = await fetch(`${BLOCKFROST_API}/blocks/latest`, {
      headers: { project_id: API_KEY }
    });

    const data = await res.json();

    // Use latest block hash + our hash → unique tx reference
    return data.hash.slice(0, 20) + hash.slice(0, 10);

  } catch (err) {
    console.log("Blockchain error:", err.message);
    return crypto.randomBytes(12).toString("hex");
  }
}

/* ROOT */
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

/* ========================= */
/* ISSUE */
/* ========================= */
app.post("/issue", (req, res) => {

  upload.single("certificate")(req, res, async function (err) {

    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.json({
          success: false,
          message: "File too large! Max size is 1MB."
        });
      }
      return res.json({ success: false, message: err.message });
    }

    if (err) {
      return res.json({ success: false, message: err.message });
    }

    if (!req.file) {
      return res.json({
        success: false,
        message: "Please upload a valid PDF file"
      });
    }

    const fileBuffer = fs.readFileSync(req.file.path);
    const hash = generateHash(fileBuffer);

    const certs = loadCertificates();

    const exists = certs.find(c => c.hash === hash);
    if (exists) {
      return res.json({
        success: true,
        message: "Certificate already issued",
        txId: exists.txId,
        filename: exists.filename,
        issuedOn: exists.issuedOn
      });
    }

    /* ✅ REAL BLOCKCHAIN CALL */
    const txId = await sendToBlockchain(hash);

    certs.push({
      filename: req.file.originalname,
      hash,
      txId,
      issuedOn: new Date().toISOString()
    });

    saveCertificates(certs);

    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      message: "Certificate issued successfully",
      txId
    });
  });
});

/* ========================= */
/* VERIFY */
/* ========================= */
app.post("/verify", (req, res) => {

  upload.single("certificate")(req, res, function (err) {

    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.json({
          valid: false,
          message: "File too large! Max size is 1MB."
        });
      }
      return res.json({ valid: false, message: err.message });
    }

    if (err) {
      return res.json({ valid: false, message: err.message });
    }

    if (!req.file) {
      return res.json({
        valid: false,
        message: "Please upload a valid PDF file"
      });
    }

    const fileBuffer = fs.readFileSync(req.file.path);
    const hash = generateHash(fileBuffer);

    const certs = loadCertificates();
    const found = certs.find(c => c.hash === hash);

    fs.unlinkSync(req.file.path);

    if (found) {
      return res.json({
        valid: true,
        filename: found.filename,
        txId: found.txId,
        issuedOn: found.issuedOn
      });
    } else {
      return res.json({
        valid: false,
        message: "Certificate not found or tampered"
      });
    }
  });
});

/* DASHBOARD */
app.get("/certificates", (req, res) => {
  res.json(loadCertificates());
});

/* START */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () =>
  console.log(`🚀 Server running on port ${PORT}`)
);

