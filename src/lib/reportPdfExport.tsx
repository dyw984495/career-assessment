// ============================================================
// 将测评报告导出为一张长图 PNG（浏览器端：离屏渲染 ReportView + html2canvas）
// ============================================================

import { createRoot, type Root } from 'react-dom/client'
import html2canvas from 'html2canvas'
import { ReportView } from '../components/ReportView'
import type { AssessmentReport } from './types'

function safeFilenamePart(name: string): string {
  return name.replace(/[/\\?%*:|"<>]/g, '_').slice(0, 80)
}

/** 限制 canvas 宽度，避免浏览器/显卡对超大 canvas 抛错 */
function pickScale(el: HTMLElement): number {
  const w = Math.max(el.offsetWidth, el.scrollWidth, 1)
  const h = Math.max(el.offsetHeight, el.scrollHeight, 1)
  const maxEdge = 12000
  const s = Math.min(2, maxEdge / w, maxEdge / h)
  return Math.max(1, Math.min(2, s))
}

/** html2canvas 无法解析 Tailwind v4 的 oklch()，用浏览器已计算好的 rgb/rgba 写成内联样式并去掉 class */
const INLINE_FOR_EXPORT = [
  'color',
  'background-color',
  'font-size',
  'font-weight',
  'font-family',
  'font-style',
  'line-height',
  'text-align',
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
  'margin-top',
  'margin-right',
  'margin-bottom',
  'margin-left',
  'border-top-width',
  'border-right-width',
  'border-bottom-width',
  'border-left-width',
  'border-top-color',
  'border-right-color',
  'border-bottom-color',
  'border-left-color',
  'border-top-style',
  'border-right-style',
  'border-bottom-style',
  'border-left-style',
  'border-radius',
  'width',
  'max-width',
  'display',
  'flex-direction',
  'justify-content',
  'align-items',
  'align-self',
  'gap',
  'flex-wrap',
  'flex',
  'flex-grow',
  'flex-shrink',
  'flex-basis',
  'box-sizing',
  'overflow',
  'overflow-x',
  'overflow-y',
  'min-width',
  'max-height',
  'vertical-align',
  'grid-template-columns',
  'grid-template-rows',
  'grid-auto-flow',
  'grid-auto-columns',
  'grid-auto-rows',
  'column-gap',
  'row-gap',
  'justify-items',
  'justify-self',
  'align-content',
  'place-items',
  'place-content',
  'list-style-type',
  'list-style-position',
  'padding-inline-start',
  'padding-inline-end',
  'margin-inline-start',
  'margin-inline-end',
  'opacity',
  'visibility',
  'white-space',
  'word-break',
  'box-shadow',
  'text-shadow',
  'text-decoration-color',
  'text-decoration-line',
  'text-decoration-style',
  'outline-color',
  'outline-width',
  'outline-style',
  'background-image',
  'background-size',
  'background-position',
  'background-repeat',
  'background-clip',
  'letter-spacing',
  'text-transform',
  '-webkit-text-stroke-color',
  '-webkit-text-stroke-width',
] as const

const UNSAFE_CSS_COLOR_FN = /oklch|lab\(|color-mix\(/i

function fallbackForUnsafeColor(prop: string, fallbackTextColor: string): string {
  if (prop === 'background-color') return '#ffffff'
  if (
    prop.endsWith('-color') ||
    prop === 'color' ||
    prop === 'fill' ||
    prop === 'stroke' ||
    prop === 'stop-color' ||
    prop === '-webkit-text-stroke-color'
  ) {
    return UNSAFE_CSS_COLOR_FN.test(fallbackTextColor) ? '#111827' : fallbackTextColor
  }
  return 'transparent'
}

/** 部分浏览器对 getComputedStyle 仍序列化为 oklch；html2canvas 无法解析，需改为 rgb 或安全回退 */
function sanitizePropertyValueForExport(prop: string, value: string, fallbackTextColor: string): string {
  if (!value || !UNSAFE_CSS_COLOR_FN.test(value)) return value
  if (prop === 'background-image' || prop === 'list-style-image') return 'none'
  if (prop.includes('shadow')) return 'none'

  const probe = document.createElement('div')
  probe.style.cssText =
    'position:absolute;left:-9999px;top:0;visibility:hidden;pointer-events:none;contain:strict;'
  try {
    probe.style.setProperty(prop, value)
  } catch {
    probe.remove()
    return fallbackForUnsafeColor(prop, fallbackTextColor)
  }
  document.body.appendChild(probe)
  const resolved = getComputedStyle(probe).getPropertyValue(prop).trim()
  probe.remove()

  if (!resolved || UNSAFE_CSS_COLOR_FN.test(resolved)) {
    return fallbackForUnsafeColor(prop, fallbackTextColor)
  }
  return resolved
}

/** 克隆文档仍含整页 Tailwind 等样式表时，html2canvas 解析阶段会碰到 oklch；导出前去掉，报告已由内联样式呈现 */
function stripGlobalStylesheetsFromClone(doc: Document) {
  doc.querySelectorAll('link[rel="stylesheet"]').forEach(el => el.remove())
  doc.querySelectorAll('style').forEach(el => el.remove())
  const reset = doc.createElement('style')
  reset.textContent = 'html,body{margin:0;padding:0}'
  doc.head?.appendChild(reset)
}

/** 等待节点内所有 img 加载（或超时），避免 html2canvas 截到未解码的大图 */
function waitForImagesInTree(root: HTMLElement, timeoutMs: number): Promise<void> {
  const imgs = [...root.querySelectorAll('img')]
  if (imgs.length === 0) return Promise.resolve()
  return Promise.race([
    Promise.all(
      imgs.map(img =>
        img.complete && img.naturalHeight > 0
          ? Promise.resolve()
          : new Promise<void>(resolve => {
              const done = () => resolve()
              img.addEventListener('load', done, { once: true })
              img.addEventListener('error', done, { once: true })
            }),
      ),
    ).then(() => undefined),
    new Promise<void>(resolve => setTimeout(resolve, timeoutMs)),
  ])
}

function syncExportStyles(original: HTMLElement, clone: HTMLElement) {
  clone.removeAttribute('class')
  clone.removeAttribute('id')
  const cs = window.getComputedStyle(original)
  const fallbackTextColor = cs.getPropertyValue('color')
  for (const prop of INLINE_FOR_EXPORT) {
    const raw = cs.getPropertyValue(prop)
    if (!raw) continue
    const v = sanitizePropertyValueForExport(prop, raw, fallbackTextColor)
    clone.style.setProperty(prop, v)
  }
  const bgImg = cs.getPropertyValue('background-image')
  if (bgImg && bgImg !== 'none') {
    const safe = sanitizePropertyValueForExport('background-image', bgImg, fallbackTextColor)
    clone.style.setProperty('background-image', safe)
  }
  const oCh = [...original.children]
  const cCh = [...clone.children]
  for (let i = 0; i < Math.min(oCh.length, cCh.length); i++) {
    const o = oCh[i]
    const c = cCh[i]
    if (o instanceof HTMLElement && c instanceof HTMLElement) {
      syncExportStyles(o, c)
    }
  }
}

export async function downloadAssessmentReportImage(report: AssessmentReport): Promise<void> {
  const div = document.createElement('div')
  div.setAttribute('data-report-export', '1')
  // 移出视口但保持不透明，html2canvas 对 opacity:0 有时会截到空白
  div.style.cssText =
    'position:fixed;left:-10000px;top:0;width:794px;max-width:100vw;background:#ffffff;padding:24px;box-sizing:border-box;overflow:visible;'

  document.body.appendChild(div)

  let root: Root | null = createRoot(div)
  root.render(<ReportView report={report} />)

  try {
    await document.fonts.ready.catch(() => {})
    await new Promise<void>(resolve => {
      requestAnimationFrame(() => setTimeout(resolve, 500))
    })
    await waitForImagesInTree(div, 15000)

    const reportRoot = div.querySelector<HTMLElement>('[data-report-pdf-root]')
    // 用报告根节点作为截图目标，不拆分成多节，避免切断卡片内容
    const targetEl: HTMLElement = reportRoot && reportRoot.children.length > 0
      ? reportRoot
      : div

    const scale = pickScale(targetEl)
    // scrollHeight 捕获完整内容（即使超出视口），offsetWidth 保留原始布局宽度
    const capW = Math.max(1, targetEl.scrollWidth, targetEl.offsetWidth)
    const capH = Math.max(1, targetEl.scrollHeight, targetEl.offsetHeight)

    const canvas = await html2canvas(targetEl, {
      scale,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      width: capW,
      height: capH,
      windowWidth: capW,
      windowHeight: capH,
      scrollX: 0,
      scrollY: 0,
      onclone: (clonedDoc, clonedRoot) => {
        if (clonedRoot instanceof HTMLElement) {
          syncExportStyles(targetEl, clonedRoot)
        }
        stripGlobalStylesheetsFromClone(clonedDoc)
      },
    })

    if (canvas.width < 2 || canvas.height < 2) {
      throw new Error('截图区域过小，请重试')
    }

    // 导出为 PNG 并触发下载
    const imgData = canvas.toDataURL('image/png')
    const filename = `职业测评报告_${safeFilenamePart(report.student?.name || '未命名')}.png`
    const link = document.createElement('a')
    link.download = filename
    link.href = imgData
    link.click()
  } finally {
    root?.unmount()
    root = null
    document.body.removeChild(div)
  }
}
