#!/usr/bin/env python3
"""Generate updated roles.ts with taskDetails from Excel."""

import pandas as pd
import re

# Read Excel
df = pd.read_excel('岗位库.xlsx')

# Parse task details from Excel
def parse_tasks(task_str):
    if pd.isna(task_str):
        return []
    tasks = re.split(r'\n(?=\d+[\.、）])', str(task_str))
    result = []
    for t in tasks:
        t = t.strip()
        if t:
            t = re.sub(r'^\d+[\.、）]\s*', '', t)
            result.append(t)
    return result

# Create task details dict
task_details = {}
for _, row in df.iterrows():
    name = str(row['岗位名称']).strip()
    tasks = row['典型任务']
    if pd.notna(tasks):
        task_details[name] = parse_tasks(tasks)

# Output Python dict for use
import json
with open('task_details.json', 'w', encoding='utf-8') as f:
    json.dump(task_details, f, ensure_ascii=False, indent=2)

print(f"Generated task_details.json with {len(task_details)} roles")
