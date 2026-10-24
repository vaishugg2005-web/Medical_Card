import re

with open('app/static/index.html', 'r', encoding='utf-8') as f:
    text = f.read()

views = re.findall(r'id=["\']view-[^"\']+["\']', text)
print("Views in index.html:", views)
