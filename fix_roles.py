#!/usr/bin/env python3
"""Fix roles.ts - replace old task arrays with TASK_DETAILS import."""

import re

with open('src/assessment/roles.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add import for TASK_DETAILS
if "from './taskDetails'" not in content:
    content = content.replace(
        "import type { Role, InterestScores, PersonalityScores } from '../lib/types'",
        "import type { Role, InterestScores, PersonalityScores } from '../lib/types'\nimport { TASK_DETAILS } from './taskDetails'"
    )

# 2. Update mkRole constructor - remove taskDetails parameter, use TASK_DETAILS
old_mkrole = '''const mkRole = (
  name: string,
  icon: string,
  interest: InterestScores,
  personality: PersonalityScores,
  desc: string,
  tasks: string[],
  school: string,
  skills: string[],
  salary: string[],
  industries: string[],
  companies: string[],
): Role => {
  const internshipRequirement = INTERNSHIP_REQUIREMENTS[name]
  if (!internshipRequirement) {
    throw new Error(`[roles] 缺少实习门槛文案（岗位库.xlsx）：${name}`)
  }
  return {
    name,
    icon,
    interest,
    personality,
    desc,
    tasks,
    school,
    skills,
    salary,
    industries,
    companies,
    internshipRequirement,
  }
}'''

new_mkrole = '''const mkRole = (
  name: string,
  icon: string,
  interest: InterestScores,
  personality: PersonalityScores,
  desc: string,
  tasks: string[],
  school: string,
  skills: string[],
  salary: string[],
  industries: string[],
  companies: string[],
): Role => {
  const internshipRequirement = INTERNSHIP_REQUIREMENTS[name]
  if (!internshipRequirement) {
    throw new Error(`[roles] 缺少实习门槛文案（岗位库.xlsx）：${name}`)
  }
  const taskDetails = TASK_DETAILS[name]
  if (!taskDetails) {
    throw new Error(`[roles] 缺少任务详情：${name}`)
  }
  return {
    name,
    icon,
    interest,
    personality,
    desc,
    tasks,
    taskDetails,
    school,
    skills,
    salary,
    industries,
    companies,
    internshipRequirement,
  }
}'''

if old_mkrole in content:
    content = content.replace(old_mkrole, new_mkrole)
    print("Updated mkRole function definition")
else:
    print("ERROR: Could not find mkRole function definition")
    exit(1)

with open('src/assessment/roles.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done updating mkRole")
