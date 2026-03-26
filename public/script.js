// ISSUE
document.getElementById("issueForm")?.addEventListener("submit", async e => {
  e.preventDefault();

  const resBox = document.getElementById("result");
  resBox.innerHTML = `<p style="color:#90caf9">⏳ Processing...</p>`;

  try {
    const formData = new FormData(e.target);
    const res = await fetch("/issue", {
      method: "POST",
      body: formData
    });

    const data = await res.json();

    if (data.success) {
      resBox.innerHTML = `
        <div style="color:lightgreen">
          <h3>✅ Certificate Issued</h3>
          <p><b>TX ID:</b> ${data.txId}</p>
        </div>
      `;
    } else {
      resBox.innerHTML = `
        <div style="color:#ff6b6b">
          <h3>❌ Error</h3>
          <p>${data.message || "Something went wrong"}</p>
        </div>
      `;
    }

  } catch (err) {
    resBox.innerHTML = `<p style="color:red">❌ Server error</p>`;
  }
});


// VERIFY
document.getElementById("verifyForm")?.addEventListener("submit", async e => {
  e.preventDefault();

  const resBox = document.getElementById("result");
  resBox.innerHTML = `<p style="color:#90caf9">🔍 Verifying...</p>`;

  try {
    const formData = new FormData(e.target);
    const res = await fetch("/verify", {
      method: "POST",
      body: formData
    });

    const data = await res.json();

    if (data.valid) {
      resBox.innerHTML = `
        <div style="
          border:1px solid #00e676;
          padding:20px;
          border-radius:10px;
          background:rgba(0,255,150,0.05);
          color:#00e676;
        ">
          <h3>✅ VALID CERTIFICATE</h3>
          <p><b>📄 File:</b> ${data.filename}</p>
          <p><b>🔗 TX ID:</b> ${data.txId}</p>
          <p><b>📅 Issued:</b> ${new Date(data.issuedOn).toLocaleString()}</p>
        </div>
      `;
    } else {
      resBox.innerHTML = `
        <div style="
          border:1px solid #ff4d4d;
          padding:20px;
          border-radius:10px;
          background:rgba(255,0,0,0.05);
          color:#ff4d4d;
        ">
          <h3>❌ INVALID / TAMPERED</h3>
        </div>
      `;
    }

  } catch (err) {
    resBox.innerHTML = `<p style="color:red">❌ Server error</p>`;
  }
});


// DASHBOARD
async function loadCertificates() {
  const table = document.querySelector("#certTable tbody");
  if (!table) return;

  try {
    const res = await fetch("/certificates");
    const data = await res.json();

    table.innerHTML = "";

    if (data.length === 0) {
      table.innerHTML = `
        <tr>
          <td colspan="3" style="text-align:center; color:#ccc;">
            No certificates issued yet
          </td>
        </tr>
      `;
      return;
    }

    data.forEach(c => {
      table.innerHTML += `
        <tr>
          <td>${c.filename}</td>
          <td style="word-break:break-all;">${c.txId}</td>
          <td>${new Date(c.issuedOn).toLocaleString()}</td>
        </tr>
      `;
    });

  } catch (err) {
    table.innerHTML = `
      <tr>
        <td colspan="3" style="color:red; text-align:center;">
          Error loading data
        </td>
      </tr>
    `;
  }
}

loadCertificates();
