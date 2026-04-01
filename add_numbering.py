#!/usr/bin/env python3
"""Generate taskDetails.ts with Chinese numbering directly from Excel."""

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
    for i, t in enumerate(tasks):
        t = t.strip()
        if t:
            t = re.sub(r'^\d+[\.、）]\s*', '', t)
            # Add numbering
            result.append(f"{i+1}. {t}")
    return result

# Create task details dict
task_details = {}
for _, row in df.iterrows():
    name = str(row['岗位名称']).strip()
    tasks = row['典型任务']
    if pd.notna(tasks):
        task_details[name] = parse_tasks(tasks)

# Mapping from Excel names to code names
role_name_map = {
    '公关传播PR': '公关传播',
    '供应链管理专员 / 管培生': '供应链管理专员 / 管培生',
}

# Generate TypeScript file
output = '''// Auto-generated from 岗位库.xlsx - 典型任务列（带编号）
export const TASK_DETAILS: Record<string, string[]> = {
'''

for role_name, tasks in task_details.items():
    code_name = role_name_map.get(role_name, role_name)
    output += f"  '{code_name}': [\n"
    for task in tasks:
        escaped = task.replace('\\', '\\\\').replace("'", "\\'")
        output += f"    '{escaped}',\n"
    output += "  ],\n"

output += '}\n'

# Write to file
with open('src/assessment/taskDetails.ts', 'w', encoding='utf-8') as f:
    f.write(output)

print(f"Generated src/assessment/taskDetails.ts with {len(task_details)} roles (numbered)")
