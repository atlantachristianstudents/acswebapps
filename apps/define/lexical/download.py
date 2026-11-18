"""Retrieve and verify the pinned dictionary archives, resuming partial transfers."""
from pathlib import Path
import shutil
from urllib.request import Request, urlopen


def download(source, directory, digest):
    directory = Path(directory)
    directory.mkdir(parents=True, exist_ok=True)
    target = directory / source["filename"]
    partial = target.with_name(target.name + ".partial")
    if target.is_file():
        if digest(target) != source["sha256"]:
            raise ValueError(f"Archive checksum mismatch: {target}")
        return target

    size = source["bytes"]
    offset = partial.stat().st_size if partial.exists() else 0
    if offset > size:
        raise ValueError(f"Partial archive exceeds expected size: {partial}")
    if shutil.disk_usage(directory).free < size - offset:
        raise ValueError(f"Insufficient disk space for {target.name}")
    if offset < size:
        headers = {"User-Agent": "Open Dictionary import (acswebapps.com)"}
        if offset:
            headers["Range"] = f"bytes={offset}-"
        print(f"Downloading {target.name}: {offset:,}/{size:,} bytes", flush=True)
        with urlopen(Request(source["download"], headers=headers), timeout=45) as response:
            if response.status == 206:
                expected = f"bytes {offset}-{size - 1}/{size}"
                if response.headers.get("Content-Range") != expected:
                    raise ValueError(f"The server returned an unexpected byte range for {target.name}")
            elif response.status == 200:
                offset = 0
            else:
                raise ValueError(f"The server returned HTTP {response.status} for {target.name}")
            with partial.open("ab" if offset else "wb") as file:
                for chunk in iter(lambda: response.read(1024 * 1024), b""):
                    offset += len(chunk)
                    if offset > size:
                        raise ValueError(f"The upstream archive size changed: {target.name}")
                    file.write(chunk)
    if partial.stat().st_size != size:
        raise ValueError(f"Download interrupted. Run download again to resume {target.name}")
    if digest(partial) != source["sha256"]:
        raise ValueError(f"Download checksum mismatch: {partial}. Verify the upstream snapshot before retrying")
    partial.replace(target)
    return target
