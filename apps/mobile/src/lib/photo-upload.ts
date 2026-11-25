import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { WEB_ORIGIN } from "./mobile-config";

type TokenProvider = () => Promise<string | null>;

export async function pickAndUploadPhoto(getToken: TokenProvider) {
  const selection = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 1,
    allowsEditing: false,
  });
  if (selection.canceled) return null;
  const asset = selection.assets[0];
  const context = ImageManipulator.ImageManipulator.manipulate(asset.uri);
  context.resize({ width: 1600 });
  const rendered = await context.renderAsync();
  const optimized = await rendered.saveAsync({
    compress: 0.85,
    format: ImageManipulator.SaveFormat.JPEG,
  });
  const token = await getToken();
  if (!token) throw new Error("Sign in before adding a photo.");
  const blob = await (await fetch(optimized.uri)).blob();
  const start = await fetch(`${WEB_ORIGIN}/api/uploads`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      action: "start",
      contentType: "image/jpeg",
      size: blob.size,
    }),
  });
  const ticket = (await start.json()) as { key?: string; uploadUrl?: string };
  if (ticket.key && ticket.uploadUrl) {
    const uploaded = await fetch(ticket.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": "image/jpeg" },
      body: blob,
    });
    if (!uploaded.ok) throw new Error("The photo could not be uploaded.");
    const completed = await fetch(`${WEB_ORIGIN}/api/uploads`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action: "complete", key: ticket.key }),
    });
    if (!completed.ok) throw new Error("The photo could not be uploaded.");
    const payload = (await completed.json()) as { url?: string };
    if (!payload.url) throw new Error("The upload did not return a photo URL.");
    return payload.url;
  }
  const data = new FormData();
  data.append("photo", {
    uri: optimized.uri,
    name: "greeting-photo.jpg",
    type: "image/jpeg",
  } as unknown as Blob);
  const response = await fetch(`${WEB_ORIGIN}/api/uploads`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: data,
  });
  if (!response.ok) throw new Error("The photo could not be uploaded.");
  const payload = (await response.json()) as { url?: string };
  if (!payload.url) throw new Error("The upload did not return a photo URL.");
  return payload.url;
}
