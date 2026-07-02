from pathlib import Path
import shutil
import subprocess

root = Path.cwd()
out = Path('/tmp/pmk-v82-19')
out.mkdir(parents=True, exist_ok=True)

archive = subprocess.Popen(
    ['git', 'archive', '58f8368d6d35a007e661f28b0b46a4e3aa9824e7'],
    stdout=subprocess.PIPE,
)
subprocess.run(['tar', '-x', '-C', str(out)], stdin=archive.stdout, check=True)
archive.wait()
if archive.returncode:
    raise SystemExit(archive.returncode)

for name in ('period-direct-v82-19.js', 'period-direct-v82-19.css', 'test-v82-19.html'):
    shutil.copy2(root / name, out / name)

path = out / 'test-v82-19.html'
text = path.read_text(encoding='utf-8')
text = text.replace(
    "const BASE=`https://cdn.jsdelivr.net/gh/kivme1984/pmk-calendar@${BASE_COMMIT}/`;",
    "const BASE='./';",
)
text = text.replace(
    "const FIX=`https://cdn.jsdelivr.net/gh/kivme1984/pmk-calendar@${FIX_COMMIT}/`;",
    "const FIX='./';",
)
path.write_text(text, encoding='utf-8')
