let scriptureText = "";

async function fetchScriptureText() {
  const response = await fetch(
    "https://cors.tools/https://cdn.r2upload.io/da84b4ce-b466-4a7b-a031-4dec1f22a566/hidden/adless/RcV",
  );

  if (!response.ok) {
    throw new Error("Could not download scripture text");
  }

  scriptureText = await response.text();
}
