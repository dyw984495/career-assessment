// ============================================================
// 学生答题表单组件 - 可复用答题界面
// ============================================================

import { useState } from 'react'
import type { Question, Student } from '../lib/types'
import { questions, scoreScale, introTexts, QUESTION_COUNT } from '../assessment'
import { useMemo } from 'react'
import { score } from '../assessment/scoring'

interface QuizFormProps {
  student: Student
  onSubmit: (answers: Record<number, number>) => void
  submitting?: boolean
}

export function QuizForm({ student, onSubmit, submitting = false }: QuizFormProps) {
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState<Record<number, number>>({})

  const question = questions[current]
  const currentAnswer = question ? answers[question.id] : undefined
  const progress = Math.round((Object.keys(answers).length / QUESTION_COUNT) * 100)

  const onAnswer = (value: number) => {
    if (!question) return
    const nextAnswers = { ...answers, [question.id]: value }
    setAnswers(nextAnswers)
    if (current < QUESTION_COUNT - 1) {
      setTimeout(() => setCurrent(v => v + 1), 100)
    }
  }

  // 检测是否全部作答
  const allAnswered = Object.keys(answers).length === QUESTION_COUNT

  const handleSubmit = () => {
    if (!allAnswered) return
    onSubmit(answers)
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* 题目头部 */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm">
        <div className="p-6 pb-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-gray-500">
              第 {current + 1} / {QUESTION_COUNT} 题
            </span>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
              question?.kind === 'interest'
                ? 'bg-orange-100 text-orange-700'
                : 'bg-blue-100 text-blue-700'
            }`}>
              {question?.kind === 'interest' ? 'RIASEC 职业兴趣' : 'IPIP 性格模型'}
            </span>
          </div>
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gray-900 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-right text-sm text-gray-400 mt-1">{progress}%</div>
        </div>

        {/* 题目文本 */}
        <div className="px-6 pb-6">
          <div className="bg-gray-50 rounded-2xl p-6 text-xl leading-relaxed text-gray-900 mb-6">
            {question?.text}
          </div>

          {/* 选项 */}
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            {scoreScale.map((item) => (
              <button
                key={item.value}
                onClick={() => onAnswer(item.value)}
                disabled={submitting}
                className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all min-h-[80px] ${
                  currentAnswer === item.value
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : 'border-gray-200 bg-white text-gray-900 hover:border-gray-400'
                } ${submitting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <span className="text-2xl font-bold">{item.value}</span>
                <span className="text-xs mt-1 text-center">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 底部导航 */}
        <div className="px-6 pb-6 flex items-center justify-between">
          <button
            onClick={() => setCurrent(v => Math.max(0, v - 1))}
            disabled={current === 0 || submitting}
            className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            上一题
          </button>

          {allAnswered ? (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-6 py-2 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? '提交中...' : '提交测评'}
            </button>
          ) : (
            <span className="text-sm text-gray-400">
              还差 {QUESTION_COUNT - Object.keys(answers).length} 题
            </span>
          )}
        </div>
      </div>

      {/* 作答进度 */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <div className="text-xs text-gray-500 mb-2 font-medium">答题进度</div>
        <div className="flex flex-wrap gap-1">
          {questions.map((q, idx) => (
            <div
              key={q.id}
              onClick={() => !submitting && setCurrent(idx)}
              className={`w-6 h-6 rounded text-xs flex items-center justify-center cursor-pointer transition-colors ${
                answers[q.id] !== undefined
                  ? 'bg-gray-900 text-white'
                  : idx === current
                  ? 'bg-gray-300 text-gray-700'
                  : 'bg-gray-100 text-gray-400'
              } ${submitting ? 'cursor-not-allowed' : 'hover:bg-gray-300'}`}
            >
              {idx + 1}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
