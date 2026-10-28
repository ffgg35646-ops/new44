#!/usr/bin/env python3
import collections
import hashlib
import json
import mmap
import os
import re
import subprocess
import sys
import zipfile
from pathlib import Path, PurePosixPath

CATEGORIES = {
    "network_server": r"dedicated[\s_-]*server|server|sessions?|multiplayer|online[\s_-]*subsystem|netdriver|listen[\s_-]*server|lobby|replication|eos[\s_.:-]*(connect|session|lobby|rtc|auth|p2p)|epic[\s_-]*online",
    "host_join_port": r"host|join|port|ip[\s_-]*address|server[\s_-]*(address|ip|port|name|list)|connect|connection|endpoint|editabletext|listsessions|hostsession|joinsession",
    "graphics_quality": r"graphics|quality|resolution|frame[\s_-]*rate|fps|battery[\s_-]*saver|gamma|shadow|bloom|light[\s_-]*shaft|scalability|render|vsync|anti[\s_-]*alias|texture[\s_-]*quality",
    "camera_zoom": r"camera|zoom|field[\s_-]*of[\s_-]*view|\bfov\b|third[\s_-]*person|first[\s_-]*person|scope|crosshair|aim[\s_-]*sensitivity|look[\s_-]*sensitivity",
    "inventory_weapons": r"inventory|weapon|item|weight|equip|equipment|slot|stack|ammo|ammunition|attachment|engram|hotbar|hot[\s_-]*bar",
    "player_stats": r"health|damage|stamina|speed|movement|torpidity|oxygen|food|water|resistance|armor|armour|harvest|taming|experience|xp[\s_-]*multiplier|difficulty|player[\s_-]*level",
    "admin_cheats": r"admin|cheat|console[\s_-]*command|giveitem|give[\s_-]*item|godmode|god[\s_-]*mode|force[\s_-]*tame|enablecheats|serveradmin|commandline",
    "configuration": r"gameusersettings|defaultgame|\.ini\b|\.uproject\b|\.uplugin\b|config|setting|optionsmenu|optionsbutton|pausemenu|mainmenuui",
    "mobile_ui": r"mobile|hud|widget|menu|button|dialog|editabletext|slider|checkbox|toggle|touch|joystick|virtual[\s_-]*key"
}
CATEGORY_RE = {k: re.compile(v, re.I) for k,v in CATEGORIES.items()}
BINARY_RE = {k: re.compile(v.encode("ascii"), re.I) for k,v in CATEGORIES.items()}
COMBINED_BINARY_RE = re.compile(
    b"|".join(b"(?P<" + k.encode("ascii") + b">(?:" + v.pattern + b"))" for k,v in BINARY_RE.items()),
    re.I
)
CODE_EXT = {".java",".kt",".xml",".json",".properties",".txt",".js",".ini",".csv",".as",".uproject",".uplugin"}
MAX_CODE_LINES_PER_CATEGORY = 250

def sha256_file(path):
    h=hashlib.sha256(); n=0
    with open(path,"rb") as f:
        for b in iter(lambda:f.read(4*1024*1024),b""):
            h.update(b); n+=len(b)
    return n,h.hexdigest()

def copy_hash(stream, dest=None):
    h=hashlib.sha256(); n=0
    out=None
    if dest is not None:
        dest=Path(dest); dest.parent.mkdir(parents=True,exist_ok=True); out=dest.open("wb")
    try:
        while True:
            b=stream.read(8*1024*1024)
            if not b: break
            n+=len(b); h.update(b)
            if out: out.write(b)
    finally:
        if out: out.close()
    return n,h.hexdigest()

def safe_member_path(base, member):
    pp=PurePosixPath(member)
    if not pp.parts or any(p in (".","..") for p in pp.parts):
        raise ValueError("unsafe archive path")
    return Path(base).joinpath(*pp.parts)

def extract(root):
    root=Path(root); apks_path=root/"tryrtyrt.apks"
    if not apks_path.is_file(): raise SystemExit(f"APKS not found: {apks_path}")
    for d in ("apks","apk-entries","dex","manifests","paks","payload-files","unpacked","pak-file-lists","repak-logs","tooling"):
        (root/d).mkdir(parents=True,exist_ok=True)
    rows=["scope\tcontainer\tpath\tbytes\tsha256\tzip_crc32\tstatus"]
    size,digest=sha256_file(apks_path)
    (root/"apks-source-sha256.txt").write_text(f"{size}\t{digest}\n",encoding="utf-8")
    with zipfile.ZipFile(apks_path) as outer:
        outer_infos=outer.infolist()
        for info in outer_infos:
            if info.is_dir(): continue
            if info.filename.lower().endswith(".apk"):
                dest=root/"apks"/Path(info.filename).name
                with outer.open(info) as src: n,h=copy_hash(src,dest)
            else:
                with outer.open(info) as src: n,h=copy_hash(src)
            rows.append(f"outer_apks\ttryrtyrt.apks\t{info.filename}\t{n}\t{h}\t{info.CRC:08x}\t{'OK' if n==info.file_size else 'SIZE_MISMATCH'}")
    payload=None; apk_entry_total=0
    for apk_path in sorted((root/"apks").glob("*.apk")):
        with zipfile.ZipFile(apk_path) as apk:
            for info in apk.infolist():
                if info.is_dir(): continue
                apk_entry_total+=1
                try:
                    if info.filename=="assets/main.obb.png":
                        dest=root/"game_payload.zip"; payload=dest
                    else:
                        dest=safe_member_path(root/"apk-entries"/apk_path.stem,info.filename)
                    with apk.open(info) as src: n,h=copy_hash(src,dest)
                    status="OK" if n==info.file_size else f"SIZE_MISMATCH:{n}!={info.file_size}"
                    rows.append(f"apk_entry\t{apk_path.name}\t{info.filename}\t{n}\t{h}\t{info.CRC:08x}\t{status}")
                    if info.filename.endswith(".dex"):
                        alias=root/"dex"/f"{apk_path.stem}_{Path(info.filename).name}"
                        alias.parent.mkdir(parents=True,exist_ok=True)
                        if not alias.exists(): alias.hardlink_to(dest)
                    if info.filename.endswith(".so"):
                        alias=root/"native"/Path(info.filename).name
                        alias.parent.mkdir(parents=True,exist_ok=True)
                        if not alias.exists(): alias.hardlink_to(dest)
                    if info.filename=="AndroidManifest.xml":
                        alias=root/"manifests"/f"{apk_path.stem}.AndroidManifest.xml"
                        alias.parent.mkdir(parents=True,exist_ok=True)
                        if not alias.exists(): alias.hardlink_to(dest)
                except Exception as e:
                    rows.append(f"apk_entry\t{apk_path.name}\t{info.filename}\t{info.file_size}\t\t{info.CRC:08x}\tERROR:{type(e).__name__}:{e}")
    if not payload or not payload.is_file():
        raise SystemExit("assets/main.obb.png was not extracted; embedded game-data ZIP is unavailable.")
    embedded_count=0
    with zipfile.ZipFile(payload) as game:
        game_infos=game.infolist()
        for info in game_infos:
            if info.is_dir(): continue
            embedded_count+=1
            try:
                dest=(root/"paks"/Path(info.filename).name) if info.filename.lower().endswith(".pak") else safe_member_path(root/"payload-files",info.filename)
                with game.open(info) as src: n,h=copy_hash(src,dest)
                status="OK" if n==info.file_size else f"SIZE_MISMATCH:{n}!={info.file_size}"
                rows.append(f"embedded_gamezip\tgame_payload.zip\t{info.filename}\t{n}\t{h}\t{info.CRC:08x}\t{status}")
            except Exception as e:
                rows.append(f"embedded_gamezip\tgame_payload.zip\t{info.filename}\t{info.file_size}\t\t{info.CRC:08x}\tERROR:{type(e).__name__}:{e}")
    (root/"archive-entry-sha256.tsv").write_text("\n".join(rows)+"\n",encoding="utf-8")
    summary=[
        f"Original APKS bytes: {size}",
        f"Original APKS SHA-256: {digest}",
        f"Outer APKS entries: {len(outer_infos)}",
        f"APK splits extracted: {len(list((root/'apks').glob('*.apk')))}",
        f"APK non-directory entries read to EOF and hashed: {apk_entry_total}",
        f"Embedded game-data ZIP non-directory entries read to EOF and hashed: {embedded_count}",
        f"PAK files copied: {len(list((root/'paks').glob('*.pak')))}",
        "All successfully read ZIP entries were streamed to EOF; Python zipfile checks their CRC at end-of-entry."
    ]
    (root/"extraction-summary.txt").write_text("\n".join(summary)+"\n",encoding="utf-8")
    print("\n".join(summary))

def unpack(root, repak):
    root=Path(root); repak=Path(repak)
    status=["pak\texpected_entries\tlisted_entries\textracted_files\tlist_status\tunpack_status"]
    for pak in sorted((root/"paks").glob("*.pak")):
        name=pak.name; lst=root/"pak-file-lists"/f"{name}.txt"
        logdir=root/"repak-logs"; logdir.mkdir(exist_ok=True)
        try:
            with lst.open("w",encoding="utf-8") as out, (logdir/f"{name}.list.stderr.txt").open("w",encoding="utf-8") as err:
                p=subprocess.run([str(repak),"list",str(pak)],stdout=out,stderr=err,check=False)
            listed=sum(1 for line in lst.open(encoding="utf-8",errors="replace") if line.strip()) if p.returncode==0 else 0
            list_status="OK" if p.returncode==0 else f"FAILED:{p.returncode}"
        except Exception as e:
            listed=0; list_status=f"FAILED:{type(e).__name__}:{e}"
        dest=root/"unpacked"/pak.stem
        try:
            with (logdir/f"{name}.unpack.log").open("w",encoding="utf-8") as out:
                p=subprocess.run([str(repak),"unpack",str(pak),"-o",str(dest),"-q"],stdout=out,stderr=subprocess.STDOUT,check=False)
            extracted=sum(1 for pth in dest.rglob("*") if pth.is_file()) if dest.exists() else 0
            unpack_status="OK" if p.returncode==0 else f"FAILED:{p.returncode}"
        except Exception as e:
            extracted=sum(1 for pth in dest.rglob("*") if pth.is_file()) if dest.exists() else 0
            unpack_status=f"FAILED:{type(e).__name__}:{e}"
        status.append(f"{name}\t{listed}\t{listed}\t{extracted}\t{list_status}\t{unpack_status}")
        print(status[-1])
    (root/"pak-extraction-status.tsv").write_text("\n".join(status)+"\n",encoding="utf-8")
    v=subprocess.run([str(repak),"--version"],capture_output=True,text=True)
    (root/"repak-version.txt").write_text((v.stdout or v.stderr).strip()+"\n",encoding="utf-8")

def scan(root):
    root=Path(root)
    all_paths=[]; path_rows=["pak\tpath\tcategories"]
    for listfile in sorted((root/"pak-file-lists").glob("*.pak.txt")):
        for line in listfile.read_text(encoding="utf-8",errors="replace").splitlines():
            if not line.strip(): continue
            all_paths.append((listfile.name,line))
            found=[k for k,rx in CATEGORY_RE.items() if rx.search(line)]
            if found: path_rows.append(f"{listfile.name}\t{line}\t{','.join(found)}")
    (root/"asset-path-matches.tsv").write_text("\n".join(path_rows)+"\n",encoding="utf-8")
    roots=[root/"unpacked",root/"apk-entries",root/"dex",root/"native",root/"payload-files",root/"jadx-out",root/"manifests"]
    files=sorted(set(p for base in roots if base.exists() for p in base.rglob("*") if p.is_file()))
    asset_dirs=[p.resolve() for p in (root/"unpacked").glob("*") if p.is_dir()] if (root/"unpacked").exists() else []
    hash_rows=["pak\tpath\tbytes\tsha256"]
    hit_rows=["file\tbytes\tcategory\toccurrences\tsamples"]
    code_rows=["source_file\tline\tcategory\ttext"]
    counts=collections.Counter(); scan_errors=[]; files_scanned=0; bytes_scanned=0; assets_hashed=0
    for file_no,file in enumerate(files,1):
        size=0; is_asset=any(str(file.resolve()).startswith(str(d)+os.sep) for d in asset_dirs)
        if is_asset:
            try:
                size,h=sha256_file(file)
                rel=file.relative_to(root/"unpacked").as_posix()
                hash_rows.append(f"{file.parent.name}.pak\\t{rel}\\t{size}\\t{h}")
                assets_hashed+=1
            except Exception as e: scan_errors.append(f"asset_hash\\t{file}\\t{type(e).__name__}:{e}")
        try:
            size=file.stat().st_size
            if size==0:
                files_scanned+=1
                if file_no % 1000 == 0: print(f"Scan progress: {file_no:,}/{len(files):,} files; {bytes_scanned:,} bytes",flush=True)
                continue
            per=collections.Counter(); ex_by_cat=collections.defaultdict(list)
            with file.open("rb") as f, mmap.mmap(f.fileno(),0,access=mmap.ACCESS_READ) as data:
                for m in COMBINED_BINARY_RE.finditer(data):
                    cat=m.lastgroup
                    if not cat: continue
                    per[cat]+=1
                    if len(ex_by_cat[cat])<3:
                        lo=max(0,m.start()-72); hi=min(size,m.end()+96)
                        fragment=bytes(data[lo:hi])
                        chunks=re.findall(rb"[\\x20-\\x7e]{4,}",fragment)
                        sample=" | ".join(s.decode("ascii","replace")[:160] for s in chunks[:4])
                        if not sample: sample=m.group(0).decode("ascii","replace")
                        ex_by_cat[cat].append(sample.replace("\\t"," ").replace("\\n"," "))
            for cat,count in per.items():
                counts[cat]+=count
                hit_rows.append(f"{file.relative_to(root).as_posix()}\\t{size}\\t{cat}\\t{count}\\t{' || '.join(ex_by_cat[cat])}")
            files_scanned+=1; bytes_scanned+=size
            if file_no % 1000 == 0:
                print(f"Scan progress: {file_no:,}/{len(files):,} files; {bytes_scanned:,} bytes",flush=True)
        except Exception as e:
            scan_errors.append(f"content_scan\\t{file}\\t{type(e).__name__}:{e}")
        if file_no % 1000 == 0:
            print(f"Hashed PAK assets: {assets_hashed:,}; accumulated content errors: {len(scan_errors):,}",flush=True)
    (root/"pak-asset-sha256.tsv").write_text("\n".join(hash_rows)+"\n",encoding="utf-8")
    (root/"content-hits.tsv").write_text("\n".join(hit_rows)+"\n",encoding="utf-8")
    # Decode and scan every source/resource text line, retaining a bounded set of examples per category.
    line_counts=collections.Counter(); examples=collections.defaultdict(list); code_lines_scanned=0
    for base in (root/"jadx-out"/"sources",root/"jadx-out"/"resources"):
        if not base.exists(): continue
        for file in base.rglob("*"):
            if not file.is_file() or file.suffix.lower() not in CODE_EXT: continue
            try:
                with file.open(encoding="utf-8",errors="replace") as f:
                    for lineno,line in enumerate(f,1):
                        code_lines_scanned+=1
                        for cat,rx in CATEGORY_RE.items():
                            if rx.search(line):
                                line_counts[cat]+=1
                                if len(examples[cat])<MAX_CODE_LINES_PER_CATEGORY:
                                    examples[cat].append((file.relative_to(root).as_posix(),lineno,line.strip().replace("\t"," ")[:360]))
            except Exception as e: scan_errors.append(f"code_scan\t{file}\t{type(e).__name__}:{e}")
    for cat,items in sorted(examples.items()):
        for file,line,text in items: code_rows.append(f"{file}\t{line}\t{cat}\t{text}")
    (root/"android-code-hits.tsv").write_text("\n".join(code_rows)+"\n",encoding="utf-8")
    extraction_rows=(root/"pak-extraction-status.tsv").read_text(encoding="utf-8",errors="replace").splitlines()[1:] if (root/"pak-extraction-status.tsv").exists() else []
    good=0
    for row in extraction_rows:
        p=row.split("\t")
        if len(p)>=6 and p[4]=="OK" and p[5]=="OK" and p[1]==p[2]==p[3]: good+=1
    hash_errors=sum(1 for row in (root/"archive-entry-sha256.tsv").read_text(encoding="utf-8",errors="replace").splitlines()[1:] if "\tERROR:" in row or "\tSIZE_MISMATCH" in row) if (root/"archive-entry-sha256.tsv").exists() else 1
    summary=[
        "# Deep static audit results","",
        f"Original APKS bytes and SHA-256: {(root/'apks-source-sha256.txt').read_text(encoding='utf-8').strip()}",
        f"PAK index paths read: {len(all_paths):,}",
        f"Extracted files scanned for content: {files_scanned:,}",
        f"Bytes in scanned files (counts aliases/copies): {bytes_scanned:,}",
        f"Extracted PAK files individually SHA-256 hashed: {assets_hashed:,}",
        f"APK/embedded archive entries with read/hash errors or size mismatch: {hash_errors:,}",
        f"Content scan errors: {len(scan_errors):,}",
        f"PAKs whose listed count equals extracted count and both operations succeeded: {good}/{len(extraction_rows)}",
        "",
        "Keyword matches across all scanned file bytes:"
    ]
    summary.extend(f"- {k}: {v:,} matches" for k,v in sorted(counts.items()))
    summary += ["", "Decoded source/resource line matches:"]
    summary.extend(f"- {k}: {v:,} matching lines; up to {MAX_CODE_LINES_PER_CATEGORY} examples retained" for k,v in sorted(line_counts.items()))
    summary += ["", "PAK extraction status:", (root/"pak-extraction-status.tsv").read_text(encoding="utf-8",errors="replace") if (root/"pak-extraction-status.tsv").exists() else "PAK status unavailable"]
    summary += ["", "JADX status:"]
    for name in ("jadx-version.txt","jadx-exit-code.txt","jadx-output-file-count.txt"):
        p=root/name
        if p.exists(): summary.append(f"- {name}: {p.read_text(encoding='utf-8',errors='replace').strip()}")
    jlog=root/"jadx.log"
    if jlog.exists():
        warnings=[x for x in jlog.read_text(encoding="utf-8",errors="replace").splitlines() if re.search(r"error|exception|failed|warn",x,re.I)]
        summary.append(f"- JADX warning/error-like log lines: {len(warnings)}")
        summary.extend(f"  - {x[:240]}" for x in warnings[:35])
    summary += [
        "",
        "Output files:",
        "- archive-entry-sha256.tsv: hashes and ZIP CRC metadata for APK and embedded archive entries.",
        "- pak-file-lists/: the full path index listing for every PAK that could be read.",
        "- pak-extraction-status.tsv: entry counts and success/failure per PAK.",
        "- pak-asset-sha256.tsv: SHA-256 of each extracted PAK entry.",
        "- asset-path-matches.tsv: indexed paths matching feature categories.",
        "- content-hits.tsv: occurrence counts and readable string examples found inside all scanned files.",
        "- android-code-hits.tsv: source/resource line matches from JADX; this is evidence, not a full semantic reconstruction of Unreal C++ runtime.",
        "",
        "Scope limitation: static scan only. It does not run the game, reconstruct all cooked Unreal Blueprint/C++ behavior, or prove runtime compatibility with arbitrary servers. Any PAK extraction failure or unreadable/encrypted content is explicitly reported below.",
        "",
        "Recorded errors:"
    ]
    summary.extend(scan_errors[:500])
    (root/"deep-content-scan.md").write_text("\n".join(summary)+"\n",encoding="utf-8")
    (root/"coverage.json").write_text(json.dumps({
        "pak_index_paths":len(all_paths),"extracted_files_scanned":files_scanned,"scanned_bytes":bytes_scanned,
        "extracted_pak_asset_hashes":assets_hashed,"pak_extraction_success_and_count_match":f"{good}/{len(extraction_rows)}",
        "archive_entry_errors":hash_errors,"content_scan_errors":scan_errors,"keyword_matches":dict(counts),
        "code_line_matches":dict(line_counts),"code_lines_scanned":code_lines_scanned
    },indent=2),encoding="utf-8")
    print((root/"deep-content-scan.md").read_text(encoding="utf-8")[:20000])

def main():
    if len(sys.argv)<3: raise SystemExit("usage: deep_ark_audit.py <extract|unpack|scan> <root> [repak_path]")
    mode=sys.argv[1]; root=Path(sys.argv[2])
    if mode=="extract": extract(root)
    elif mode=="unpack":
        if len(sys.argv)<4: raise SystemExit("unpack mode requires repak binary")
        unpack(root,sys.argv[3])
    elif mode=="scan": scan(root)
    else: raise SystemExit("unknown mode: "+mode)

if __name__=="__main__": main()
