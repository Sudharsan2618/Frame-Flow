import glob
import os

files = glob.glob(r"c:\Users\WELCOME\Desktop\Recruit\UI\lib\api\*.ts")
for fpath in files:
    with open(fpath, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Replace literal \n with actual newline
    content = content.replace("\\n", "\n")
    
    with open(fpath, "w", encoding="utf-8") as f:
        f.write(content)

print(f"Fixed {len(files)} files.")
