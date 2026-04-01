#!/usr/bin/env python3
"""Add taskDetails section to ReportView.tsx."""

with open('src/components/ReportView.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the "典型任务" section and add taskDetails after it
old_section = '''<div>
                  <h4 className="font-semibold text-gray-700 text-sm mb-2">典型任务</h4>
                  <ul className="space-y-2 list-none m-0 p-0">{role.tasks.map(task => taskDetailLine(task))}</ul>
                </div>'''

new_section = '''<div>
                  <h4 className="font-semibold text-gray-700 text-sm mb-2">典型任务</h4>
                  <ul className="space-y-2 list-none m-0 p-0">{role.tasks.map(task => taskDetailLine(task))}</ul>
                </div>

                {role.taskDetails && role.taskDetails.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-semibold text-gray-700 text-sm mb-2">任务详解</h4>
                    <ul className="space-y-2 list-none m-0 p-0">
                      {role.taskDetails.map((detail, idx) => (
                        <li key={idx} className="text-xs text-gray-600 leading-relaxed">
                          {detail}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}'''

if old_section in content:
    content = content.replace(old_section, new_section)
    print("Added taskDetails section to ReportView.tsx")
else:
    print("ERROR: Could not find typical tasks section")
    exit(1)

with open('src/components/ReportView.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done")
