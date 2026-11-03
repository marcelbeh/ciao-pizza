import type { Photo } from "../../core/baking/model";
import { photoLimits, assertPhoto } from "../../core/baking/validation";
/** Local decoding and JPEG re-encoding strips metadata; no photo is uploaded. */
export async function preparePhoto(file: File): Promise<Photo> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw Error(
      "Bitte JPEG, PNG oder WebP wählen. HEIC/HEIF vorher als JPEG exportieren.",
    );
  if (file.size > photoLimits.fileBytes)
    throw Error("Das Originalfoto darf höchstens 10 MB groß sein.");
  if (!file.size) throw Error("Das Foto ist leer.");
  const header = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const signature =
    file.type === "image/jpeg"
      ? header[0] === 255 && header[1] === 216 && header[2] === 255
      : file.type === "image/png"
        ? [137, 80, 78, 71, 13, 10, 26, 10].every((n, i) => header[i] === n)
        : String.fromCharCode(...header.slice(0, 4)) === "RIFF" &&
          String.fromCharCode(...header.slice(8, 12)) === "WEBP";
  if (!signature)
    throw Error(
      "Die Datei ist kein gültiges JPEG-, PNG- oder WebP-Bild. Bitte erneut exportieren.",
    );
  const url = URL.createObjectURL(file);
  const image = new Image();
  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () =>
        reject(
          Error(
            "Das Foto konnte nicht gelesen werden. Bitte als JPEG exportieren.",
          ),
        );
      image.src = url;
    });
    if (
      !image.naturalWidth ||
      !image.naturalHeight ||
      image.naturalWidth * image.naturalHeight > 50000000
    )
      throw Error(
        "Bildauflösung zu groß (maximal 50 Megapixel). Bitte vorher verkleinern.",
      );
    const scale = Math.min(
      1,
      photoLimits.side / Math.max(image.naturalWidth, image.naturalHeight),
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx)
      throw Error("Bildverarbeitung ist in diesem Browser nicht verfügbar.");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    let blob: Blob | null = null;
    for (const quality of [0.82, 0.68, 0.5, 0.35]) {
      blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", quality),
      );
      if (blob && blob.size <= photoLimits.bytes) break;
    }
    if (!blob || blob.size > photoLimits.bytes)
      throw Error(
        "Das Foto konnte nicht unter 350 KB verkleinert werden. Bitte einen kleineren Ausschnitt wählen.",
      );
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () =>
        reject(Error("Foto konnte nicht gespeichert werden."));
      reader.readAsDataURL(blob!);
    });
    const photo: Photo = {
      id: crypto.randomUUID(),
      dataUrl,
      bytes: blob.size,
      width: canvas.width,
      height: canvas.height,
      caption: "",
    };
    assertPhoto(photo);
    return photo;
  } finally {
    URL.revokeObjectURL(url);
    image.src = "";
  }
}
