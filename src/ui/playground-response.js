// One response is used for the picture, headers and download. Never refetch an img src.
function responseDetails(res, endpoint, size, elapsed, method = "GET") {
  const holder = document.getElementById("pgResponseDetails");
  const list = document.getElementById("pgResponseInfo");
  const lowquality = /^\/(?:api\/)?lowquality\/?$/.test(
    new URL(endpoint, ORIGIN).pathname,
  );
  holder.hidden = !pgIqc.info(endpoint) && !lowquality;
  list.replaceChildren();
  if (holder.hidden) return;
  function row(label, value, bad) {
    const dt = document.createElement("dt"),
      dd = document.createElement("dd");
    dt.textContent = label;
    dd.textContent = value;
    if (bad) dd.className = "bad";
    list.append(dt, dd);
  }
  row("HTTP", String(res.status), !res.ok);
  row("Metode request", method);
  // All headers actually readable by fetch, not guessed from documentation.
  res.headers.forEach((value, name) =>
    row(name, value, name.endsWith("error-code")),
  );
  row("Ukuran file", size + " bytes");
  row("Waktu", elapsed + " ms");
  row("URL request", new URL(endpoint, ORIGIN).href);
  return { row };
}

async function executePlayground(e, settings = {}) {
  e.preventDefault();
  pgIqc.fromEndpoint({ quiet: true });
  const form = document.getElementById("playgroundForm");
  if (!(settings.automatic ? form.checkValidity() : form.reportValidity()))
    return;
  const method = document.getElementById("pgMethod").value;
  const endpoint = document.getElementById("pgEndpoint").value.trim();
  const bodyText = document.getElementById("pgBody").value.trim();
  const iqc = pgIqc.info(endpoint),
    key = iqc ? pgIqc.requestKey() : "";
  if (iqc && pgIqc.busy()) {
    pgIqc.schedule(0);
    return;
  }
  const upload = pgIqc.upload();
  if (upload && !upload.file) {
    document.getElementById("pgIqcLiveStatus").textContent =
      "Pilih foto profil sebelum membuat gambar.";
    return;
  }
  const submitBtn = document.getElementById("pgSubmitBtn"),
    btnText = document.getElementById("pgBtnText");
  const statusBadge = document.getElementById("pgStatusBadge"),
    timeBadge = document.getElementById("pgTimeBadge");
  const responsePre = document.getElementById("pgResponseCode"),
    live = document.getElementById("pgIqcLiveStatus");
  const errorBox = document.getElementById("pgImageError");
  if (pgAbortController) pgAbortController.abort();
  const id = ++pgRequestId,
    controller = new AbortController();
  pgAbortController = controller;
  if (iqc) pgIqc.beginRequest();
  const timeout = setTimeout(() => controller.abort(), 70000);
  submitBtn.classList.add("loading");
  submitBtn.disabled = true;
  btnText.innerHTML = '<div class="spinner"></div> Memproses';
  statusBadge.className = "res-status-badge status-idle";
  statusBadge.textContent = "Memuat gambar…";
  timeBadge.textContent = "…";
  errorBox.hidden = true;
  errorBox.textContent = "";
  if (!iqc) {
    releasePlaygroundImage();
    responsePre.textContent = "Menghubungi server…";
    document.getElementById("pgResponseDetails").hidden = true;
  } else {
    live.textContent =
      "Membuat " +
      iqc.type.toUpperCase() +
      " dari isian terbaru. Gambar sebelumnya belum diperbarui.";
    if (!responsePre.querySelector("img"))
      responsePre.textContent = "Menyiapkan gambar…";
    document.getElementById("pgIqcNote").textContent =
      "Render gambar berjalan. Cold start Chromium dapat memerlukan beberapa detik.";
  }
  savePlayground();
  const t0 = performance.now();
  try {
    const options = { method, headers: {}, signal: controller.signal };
    if (upload) {
      options.method = "POST";
      options.body = new FormData();
      options.body.append("profile", upload.file);
    } else if (method === "POST") {
      try {
        JSON.parse(bodyText);
      } catch (_) {
        throw new Error(
          "Request body bukan JSON valid. Periksa tanda kutip, koma dan kurung.",
        );
      }
      options.headers["Content-Type"] = "application/json";
      options.body = bodyText;
    }
    const res = await fetch(endpoint, options);
    if (id !== pgRequestId) return;
    const ctype = res.headers.get("content-type") || "";
    const blob = await res.blob();
    if (id !== pgRequestId) return;
    if (iqc && key !== pgIqc.requestKey()) {
      live.textContent =
        "Isian berubah saat render. Hasil lama tidak ditampilkan; menunggu gambar terbaru.";
      return;
    }
    const elapsed = Math.round(performance.now() - t0);
    timeBadge.textContent = elapsed + " ms";
    statusBadge.textContent =
      res.status + " " + (res.statusText || (res.ok ? "OK" : "Error"));
    statusBadge.className =
      "res-status-badge " + (res.ok ? "status-200" : "status-400");
    const detail = responseDetails(
      res,
      endpoint,
      blob.size,
      elapsed,
      options.method,
    );
    const image = ctype.startsWith("image/");
    if (iqc && !/^image\/(?:jpeg|png)(?:;|$)/i.test(ctype)) {
      const text = await blob.text();
      let message;
      try {
        message = JSON.parse(text).message;
      } catch (_) {}
      throw new Error(
        message ||
          "Endpoint " +
            iqc.type.toUpperCase() +
            " mengirim " +
            (ctype || "tipe kosong") +
            ", bukan gambar. Periksa URL / deployment API.",
      );
    }
    if (image) {
      releasePlaygroundImage();
      pgImageURL = URL.createObjectURL(blob);
      const view = document.createElement("img");
      view.className = "res-img";
      view.src = pgImageURL;
      view.alt =
        "Hasil gambar " +
        (iqc ? iqc.type.toUpperCase() : new URL(endpoint, ORIGIN).pathname);
      view.dataset.endpoint = endpoint;
      view.dataset.requestKey = key;
      view.onload = () => {
        if (id !== pgRequestId) return;
        detail?.row(
          "Dimensi gambar",
          view.naturalWidth + " × " + view.naturalHeight + " px",
        );
        if (iqc && key === pgIqc.requestKey())
          live.textContent =
            (res.ok
              ? "Gambar sesuai isian terbaru · "
              : "Gambar fallback / error · ") +
            iqc.type.toUpperCase() +
            " · " +
            view.naturalWidth +
            " × " +
            view.naturalHeight +
            " px";
      };
      const note = document.createElement("span");
      note.className = "res-note";
      note.textContent =
        ctype +
        " · " +
        (blob.size / 1024).toFixed(1) +
        " KB · " +
        elapsed +
        " ms";
      const download = document.createElement("a");
      download.className = "res-download";
      download.href = pgImageURL;
      download.download = /\/(?:api\/)?lowquality(?:[/?]|$)/.test(endpoint)
        ? "lowquality." +
          (ctype.includes("png")
            ? "png"
            : ctype.includes("webp")
              ? "webp"
              : ctype.includes("gif")
                ? "gif"
                : ctype.includes("avif")
                  ? "avif"
                  : ctype.includes("bmp")
                    ? "bmp"
                    : "jpg")
        : pgIqc.filename(iqc);
      download.textContent =
        "Unduh " + download.download.split(".").pop().toUpperCase();
      responsePre.replaceChildren(view, note, download);
      if (!res.ok) {
        errorBox.hidden = false;
        errorBox.textContent =
          "HTTP " +
          res.status +
          ": ini gambar fallback, bukan render sukses. Lihat X-IQC-Error-Code pada header.";
      }
      responsePre.dataset.imageInfo =
        "HTTP " +
        res.status +
        "\nContent-Type: " +
        ctype +
        "\nUkuran: " +
        blob.size +
        " bytes\nMetode: " +
        options.method +
        "\nURL: " +
        new URL(endpoint, ORIGIN).href;
    } else {
      releasePlaygroundImage();
      const text = await blob.text();
      if (ctype.includes("application/json")) {
        try {
          renderBox(
            "pgResponseCode",
            JSON.stringify(JSON.parse(text), null, 2),
            "json",
          );
        } catch (_) {
          renderBox("pgResponseCode", text, "plain");
        }
      } else renderBox("pgResponseCode", text, "plain");
    }
    if (iqc)
      document.getElementById("pgIqcNote").textContent = res.ok
        ? "Gambar, kode dan parameter mengikuti isian. Unduh memakai respons yang sama; tidak ada request kedua."
        : "Request gagal. Periksa HTTP dan header error; gambar fallback bukan sukses.";
  } catch (error) {
    if (id !== pgRequestId || (iqc && key !== pgIqc.requestKey())) return;
    const message =
      error.name === "AbortError"
        ? "Request dibatalkan / melewati 70 detik. Coba Kirim lagi."
        : error.message;
    statusBadge.textContent = "Error";
    statusBadge.className = "res-status-badge status-400";
    timeBadge.textContent = Math.round(performance.now() - t0) + " ms";
    if (iqc) {
      errorBox.hidden = false;
      errorBox.textContent = message;
      live.textContent =
        "Gambar terbaru gagal dibuat. Jika ada gambar di bawah, itu hasil sebelumnya.";
      if (!responsePre.querySelector("img"))
        responsePre.textContent =
          "Belum ada gambar sukses. Periksa pesan error dan header di atas.";
      document.getElementById("pgIqcNote").textContent =
        "Gagal membuat gambar: " + message;
    } else renderBox("pgResponseCode", "Request gagal: " + message, "plain");
  } finally {
    clearTimeout(timeout);
    if (id === pgRequestId) {
      submitBtn.classList.remove("loading");
      submitBtn.disabled = false;
      btnText.textContent = "Kirim";
      pgAbortController = null;
      if (iqc) pgIqc.finishRequest(key);
    }
  }
}

function clearPlayground() {
  pgIqc.pause();
  pgRequestId++;
  if (pgAbortController) pgAbortController.abort();
  pgAbortController = null;
  document.getElementById("pgSubmitBtn").classList.remove("loading");
  document.getElementById("pgSubmitBtn").disabled = false;
  document.getElementById("pgBtnText").textContent = "Kirim";
  document.getElementById("pgResponseDetails").hidden = true;
  document.getElementById("pgImageError").hidden = true;
  document.getElementById("pgIqcLiveStatus").textContent =
    "Respons dibersihkan; otomatis dijeda. Aktifkan pratinjau atau tekan Kirim.";
  releasePlaygroundImage();
  renderBox("pgResponseCode", "Respons dibersihkan.", "plain");
  const badge = document.getElementById("pgStatusBadge");
  badge.className = "res-status-badge status-idle";
  badge.textContent = "Ready";
  document.getElementById("pgTimeBadge").textContent = "0 ms";
  showToast("Playground dibersihkan");
}
