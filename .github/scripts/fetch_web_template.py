"""Pull only the web export template out of Godot's 1.28 GB export-templates
archive using HTTP byte ranges, so the whole archive is never downloaded.

The .tpz is a plain zip. zipfile reads the central directory from the end of
the file through a file-like object whose read() is a Range request; the
wanted member is then fetched with ONE range request over its compressed
bytes and inflated locally (zipfile's own streaming reads 4 KB at a time,
which would mean thousands of requests)."""
import os
import struct
import sys
import zipfile
import zlib
import urllib.request

VERSION = "4.7.2"
URL = (f"https://github.com/godotengine/godot/releases/download/"
       f"{VERSION}-stable/Godot_v{VERSION}-stable_export_templates.tpz")
DEST = os.path.expanduser(f"~/.local/share/godot/export_templates/{VERSION}.stable")


class HTTPRangeFile:
    def __init__(self, url):
        req = urllib.request.Request(url, method="HEAD")
        with urllib.request.urlopen(req, timeout=60) as r:
            self.size = int(r.headers["Content-Length"])
            self.url = r.geturl()
        self.pos = 0
        self.requests = 0
        self.bytes = 0

    def seek(self, off, whence=0):
        if whence == 0:
            self.pos = off
        elif whence == 1:
            self.pos += off
        elif whence == 2:
            self.pos = self.size + off
        return self.pos

    def tell(self):
        return self.pos

    def fetch(self, start, length):
        end = min(start + length, self.size) - 1
        req = urllib.request.Request(self.url, headers={"Range": f"bytes={start}-{end}"})
        with urllib.request.urlopen(req, timeout=600) as r:
            data = r.read()
        self.requests += 1
        self.bytes += len(data)
        return data

    def read(self, n=-1):
        if n is None or n < 0:
            n = self.size - self.pos
        if n == 0 or self.pos >= self.size:
            return b""
        data = self.fetch(self.pos, n)
        self.pos += len(data)
        return data

    def seekable(self):
        return True

    def readable(self):
        return True


def extract_member(f, info, out_path):
    # Local file header: signature(4) ver(2) flag(2) comp(2) time(2) date(2)
    # crc(4) csize(4) usize(4) namelen(2) extralen(2) = 30 bytes.
    header = f.fetch(info.header_offset, 30)
    sig, _, _, comp, _, _, _, _, _, namelen, extralen = struct.unpack("<IHHHHHIIIHH", header)
    assert sig == 0x04034b50, "not a local file header"
    data_start = info.header_offset + 30 + namelen + extralen
    raw = f.fetch(data_start, info.compress_size)
    if comp == zipfile.ZIP_STORED:
        data = raw
    elif comp == zipfile.ZIP_DEFLATED:
        data = zlib.decompressobj(-15).decompress(raw)
    else:
        raise SystemExit(f"unsupported compression {comp} for {info.filename}")
    if len(data) != info.file_size:
        raise SystemExit(f"size mismatch for {info.filename}: {len(data)} != {info.file_size}")
    if (zlib.crc32(data) & 0xFFFFFFFF) != info.CRC:
        raise SystemExit(f"crc mismatch for {info.filename}")
    with open(out_path, "wb") as dst:
        dst.write(data)
    return len(data)


def main():
    os.makedirs(DEST, exist_ok=True)
    f = HTTPRangeFile(URL)
    print(f"archive size {f.size} bytes", flush=True)
    z = zipfile.ZipFile(f)
    names = z.namelist()
    print(f"{len(names)} members; central directory read with {f.requests} requests, {f.bytes} bytes", flush=True)
    web = [n for n in names if os.path.basename(n).startswith("web_") and n.endswith(".zip")]
    print("web members:", web, flush=True)
    wanted = [n for n in web if "nothreads_release" in n] or web
    for n in wanted:
        info = z.getinfo(n)
        out = os.path.join(DEST, os.path.basename(n))
        print(f"fetching {n} ({info.compress_size} compressed, {info.file_size} bytes) -> {out}", flush=True)
        written = extract_member(f, info, out)
        print(f"  wrote {written} bytes, crc ok", flush=True)
    if "templates/version.txt" in names:
        info = z.getinfo("templates/version.txt")
        extract_member(f, info, os.path.join(DEST, "version.txt"))
        print("version.txt:", open(os.path.join(DEST, "version.txt")).read().strip(), flush=True)
    print(f"total range requests: {f.requests}, bytes fetched: {f.bytes}", flush=True)


if __name__ == "__main__":
    sys.exit(main())
