import sys
sys.path.append(r'D:\CodeSage\api')
from app import get_prompt
modes = ['bugs','improvements','refactor','explain','performance','security','overview','architecture']
code = "def add(a,b):\n    return a+b\n"
for md in modes:
    print("----", md, "----")
    print(get_prompt(md, code)[:800])
    print()
