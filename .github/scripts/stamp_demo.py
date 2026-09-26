"""Stamp the exported web build's index.html with the commit it was built from
and the plain statement that it is the real slice, not enhanced footage.

Joshua's rulings: everything shown stays real gameplay and any enhanced cut is
labelled (2026-09-24); no false gameplay data (2026-09-26). The label is a
fixed, click-through strip in the interface direction of docs/gdd/09 (dark,
see-through, plain words). The ref is rendered as given, never assumed to be
main. Usage: stamp_demo.py <index.html> <commit> <date> <ref>"""
import sys

LABEL = (
    '<div id="dream-real-slice" style="position:fixed;right:8px;top:8px;z-index:9999;'
    'font:13px/1.4 sans-serif;color:#e6e6e6;background:rgba(10,12,18,0.62);'
    'padding:6px 10px;border-radius:6px;pointer-events:none;max-width:44vw;text-align:right">'
    'DREAM ONLINE combat slice. Real build of commit {commit} on {ref}, exported {date}. '
    'Real gameplay in your browser, nothing enhanced. First load is about 130 MB.'
    '</div>\n'
)


def main(path, commit, date, ref):
    html = open(path, encoding="utf-8").read()
    if 'id="dream-real-slice"' in html:
        raise SystemExit("already stamped")
    label = LABEL.format(commit=commit[:7], date=date, ref=ref)
    marker = "</body>"
    if marker not in html:
        raise SystemExit("no </body> in the exported page")
    html = html.replace(marker, label + marker, 1)
    html = html.replace("<title>", "<title>DREAM ONLINE combat slice (real build " + commit[:7] + ") - ", 1)
    open(path, "w", encoding="utf-8").write(html)
    print(f"stamped {path} with {commit[:7]} on {ref}, {date}")


if __name__ == "__main__":
    if len(sys.argv) != 5:
        raise SystemExit(__doc__)
    main(*sys.argv[1:])
